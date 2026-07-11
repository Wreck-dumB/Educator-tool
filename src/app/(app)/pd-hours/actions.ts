"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

const VALID_PD_TYPES = ["first_aid", "child_protection", "curriculum", "leadership", "nqs", "wellbeing", "other"] as const;

export async function logPdHours(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service" };

  const courseName = (formData.get("course_name") as string)?.trim();
  const provider = (formData.get("provider") as string)?.trim() || null;
  const completedDate = formData.get("completed_date") as string;
  const hours = parseFloat(formData.get("hours") as string);
  const pdType = formData.get("pd_type") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!courseName) return { error: "Course name is required" };
  if (!completedDate) return { error: "Date is required" };
  if (isNaN(hours) || hours <= 0 || hours > 100) return { error: "Hours must be between 0.5 and 100" };
  if (!VALID_PD_TYPES.includes(pdType as never)) return { error: "Invalid PD type" };

  const { error } = await supabase.from("staff_pd_hours").insert({
    owner_user_id: ownerUserId,
    staff_user_id: user.id,
    course_name: courseName,
    provider,
    completed_date: completedDate,
    hours,
    pd_type: pdType as never,
    notes,
  });

  if (error) return { error: error.message };
  revalidatePath("/pd-hours");
  return {};
}

export async function deletePdEntry(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Staff can delete their own entries; Director/2IC can delete any
  const { error } = await supabase.from("staff_pd_hours").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/pd-hours");
  return {};
}
