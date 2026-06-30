"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import type { ProgramEntrySuggestion } from "@/lib/types/domain";
import type { CulturalDay } from "@/lib/types/database.types";

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
