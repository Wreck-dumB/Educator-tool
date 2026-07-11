"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getMyStaffRole } from "@/lib/supabase/staff";

export async function addShift(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const myRole = await getMyStaffRole();
  if (myRole !== "director" && myRole !== "2ic") return { error: "Only Director or 2IC can manage the roster" };

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service" };

  const staffUserId = formData.get("staff_user_id") as string;
  const rosterDate = formData.get("roster_date") as string;
  const shiftStart = formData.get("shift_start") as string;
  const shiftEnd = formData.get("shift_end") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!staffUserId || !rosterDate || !shiftStart || !shiftEnd) return { error: "Staff member, date, start and end time are all required" };
  if (shiftStart >= shiftEnd) return { error: "End time must be after start time" };

  const { error } = await supabase.from("staff_roster").insert({
    owner_user_id: ownerUserId,
    staff_user_id: staffUserId,
    roster_date: rosterDate,
    shift_start: shiftStart,
    shift_end: shiftEnd,
    notes,
  });

  if (error) return { error: error.message };
  revalidatePath("/staff/roster");
  return {};
}

export async function deleteShift(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service" };

  const myRole = await getMyStaffRole();
  if (myRole !== "director" && myRole !== "2ic") return { error: "Insufficient permission" };

  const { error } = await supabase.from("staff_roster").delete().eq("id", id).eq("owner_user_id", ownerUserId);
  if (error) return { error: error.message };
  revalidatePath("/staff/roster");
  return {};
}
