"use server";

import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import type { ActivitySuggestion } from "@/lib/types/domain";
import type { GenerationMode } from "@/lib/types/database.types";

export async function saveActivity(
  suggestion: ActivitySuggestion,
  generationMode: GenerationMode,
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

  const { data: activity, error: insertError } = await supabase
    .from("generated_activities")
    .insert({
      owner_user_id: ownerUserId,
      title: suggestion.title,
      summary: suggestion.summary,
      steps: suggestion.steps,
      materials_used: suggestion.materialsUsed,
      reflection_prompts: suggestion.reflectionPrompts,
      age_range: suggestion.ageRange,
      duration_minutes: suggestion.durationMinutes,
      energy_level: suggestion.energyLevel,
      group_size_fit: suggestion.groupSizeFit,
      generation_mode: generationMode,
      suggested_template: suggestion.suggestedTemplate,
      card_items: suggestion.cardItems,
      card_pairs: suggestion.cardPairs,
      image_subject: suggestion.imageSubject,
      clipart_id: suggestion.clipartId,
      letter_text: suggestion.letterText,
      matching_left: suggestion.matchingLeft,
      matching_right: suggestion.matchingRight,
      counting_groups: suggestion.countingGroups,
    })
    .select("id")
    .single();

  if (insertError || !activity) {
    return { error: insertError?.message ?? "Could not save activity" };
  }

  if (suggestion.eylfCodes.length > 0) {
    const { data: outcomes } = await supabase
      .from("eylf_outcomes")
      .select("id, code")
      .in("code", suggestion.eylfCodes);

    if (outcomes && outcomes.length > 0) {
      await supabase.from("activity_eylf_links").insert(
        outcomes.map((o) => ({ activity_id: activity.id, eylf_outcome_id: o.id })),
      );
    }
  }

  return { id: activity.id };
}
