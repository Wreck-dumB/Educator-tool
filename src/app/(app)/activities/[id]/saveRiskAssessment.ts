"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RiskAssessmentSuggestion } from "@/lib/types/domain";

export async function saveRiskAssessment(
  activityId: string,
  activityTitle: string,
  suggestion: RiskAssessmentSuggestion,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("risk_assessments")
    .insert({
      owner_user_id: user.id,
      activity_id: activityId,
      title: `Risk assessment: ${activityTitle}`,
      context_notes: suggestion.contextNotes,
      hazards: suggestion.hazards,
      involves_excursion: suggestion.involvesExcursion,
      involves_sleep_rest: suggestion.involvesSleepRest,
      involves_water: suggestion.involvesWater,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save risk assessment" };
  }

  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/risk-assessments");
  return { id: data.id };
}

export async function markRiskAssessmentReviewed(id: string, activityId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("risk_assessments").update({ reviewed_at: new Date().toISOString() }).eq("id", id);
  if (activityId) revalidatePath(`/activities/${activityId}`);
  revalidatePath("/risk-assessments");
}
