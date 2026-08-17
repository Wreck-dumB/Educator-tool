"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getMyStaffRole } from "@/lib/supabase/staff";

const MAX_RANGE_DAYS = 60;
const LEAVE_TYPES = ["annual", "sick", "public_holiday", "other"] as const;
type LeaveType = (typeof LEAVE_TYPES)[number];

function datesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(start);
  const last = new Date(end);
  while (cursor <= last) {
    dates.push(cursor.toLocaleDateString("en-CA"));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export async function addLeave(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const myRole = await getMyStaffRole();
  if (myRole !== "director" && myRole !== "2ic") return { error: "Only Director or 2IC can manage leave" };

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service" };

  const staffUserId = formData.get("staff_user_id") as string;
  const startDate = formData.get("start_date") as string;
  const endDateRaw = formData.get("end_date") as string;
  const endDate = endDateRaw || startDate;
  const leaveTypeRaw = (formData.get("leave_type") as string) || "annual";
  const leaveType: LeaveType = LEAVE_TYPES.includes(leaveTypeRaw as LeaveType) ? (leaveTypeRaw as LeaveType) : "annual";
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!staffUserId || !startDate) return { error: "Staff member and start date are required" };
  if (endDate < startDate) return { error: "End date must be on or after the start date" };

  const dates = datesBetween(startDate, endDate);
  if (dates.length > MAX_RANGE_DAYS) return { error: `Leave range can't exceed ${MAX_RANGE_DAYS} days` };

  const rows = dates.map((leave_date) => ({
    owner_user_id: ownerUserId,
    staff_user_id: staffUserId,
    leave_date,
    leave_type: leaveType,
    notes,
    created_by: user.id,
  }));

  const { error } = await supabase
    .from("staff_leave")
    .upsert(rows, { onConflict: "owner_user_id,staff_user_id,leave_date" });

  if (error) return { error: error.message };
  revalidatePath("/staff/roster/leave");
  return {};
}

export async function deleteLeave(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service" };

  const myRole = await getMyStaffRole();
  if (myRole !== "director" && myRole !== "2ic") return { error: "Insufficient permission" };

  const { error } = await supabase.from("staff_leave").delete().eq("id", id).eq("owner_user_id", ownerUserId);
  if (error) return { error: error.message };
  revalidatePath("/staff/roster/leave");
  return {};
}
