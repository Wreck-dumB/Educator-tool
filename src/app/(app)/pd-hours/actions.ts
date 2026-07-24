"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

const VALID_PD_TYPES = ["first_aid", "child_protection", "curriculum", "leadership", "nqs", "wellbeing", "other"] as const;

export async function logPdHours(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/onboarding");

  const courseName = (formData.get("course_name") as string)?.trim();
  const provider = (formData.get("provider") as string)?.trim() || null;
  const completedDate = formData.get("completed_date") as string;
  const hours = parseFloat(formData.get("hours") as string);
  const pdType = formData.get("pd_type") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!courseName) redirect("/pd-hours?error=" + encodeURIComponent("Course name is required"));
  if (!completedDate) redirect("/pd-hours?error=" + encodeURIComponent("Date is required"));
  if (isNaN(hours) || hours <= 0 || hours > 100) redirect("/pd-hours?error=" + encodeURIComponent("Hours must be between 0.5 and 100"));
  if (!VALID_PD_TYPES.includes(pdType as never)) redirect("/pd-hours?error=" + encodeURIComponent("Invalid PD type"));

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

  if (error) redirect("/pd-hours?error=" + encodeURIComponent(error.message));
  revalidatePath("/pd-hours");
}

export async function deletePdEntry(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("staff_pd_hours").delete().eq("id", id);
  revalidatePath("/pd-hours");
}
