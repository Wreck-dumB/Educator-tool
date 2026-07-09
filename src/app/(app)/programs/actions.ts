"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import type { ProgramEntrySuggestion } from "@/lib/types/domain";
import type { CulturalDay } from "@/lib/types/database.types";

export async function addActivityToProgram(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/programs");

  const programId = formData.get("program_id") as string;
  const activityId = (formData.get("activity_id") as string) || null;
  const dayDate = formData.get("day_date") as string;
  const title = (formData.get("title") as string)?.trim();
  const eylfCodesJson = (formData.get("eylf_codes") as string) || "[]";
  const eylfCodes = JSON.parse(eylfCodesJson) as string[];

  if (!programId || !dayDate || !title) redirect("/programs");

  const { error } = await supabase.from("program_entries").insert({
    program_id: programId,
    activity_id: activityId,
    day_date: dayDate,
    title,
    eylf_codes: eylfCodes,
    notes: null,
  });

  if (error) {
    redirect(`/programs/${programId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/programs/${programId}`);
  redirect(`/programs/${programId}`);
}

export async function saveProgram(
  title: string,
  startDate: string,
  endDate: string,
  culturalDays: CulturalDay[],
  entries: ProgramEntrySuggestion[],
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) {
    return { error: "No active service membership" };
  }

  const { data: program, error: programError } = await supabase
    .from("programs")
    .insert({
      owner_user_id: ownerUserId,
      title,
      start_date: startDate,
      end_date: endDate,
      cultural_days: culturalDays,
    })
    .select("id")
    .single();

  if (programError || !program) {
    return { error: programError?.message ?? "Could not save program" };
  }

  if (entries.length > 0) {
    const { error: entriesError } = await supabase.from("program_entries").insert(
      entries.map((e) => ({
        program_id: program.id,
        day_date: e.dayDate,
        title: e.title,
        notes: e.notes,
        activity_id: e.activityId,
        eylf_codes: e.eylfCodes,
      })),
    );
    if (entriesError) {
      return { error: entriesError.message };
    }
  }

  revalidatePath("/programs");
  return { id: program.id };
}
