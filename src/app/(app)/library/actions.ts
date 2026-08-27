"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

/**
 * Copies an approved shared-library activity into the current service's own
 * generated_activities, exactly as if it had just been generated — same
 * shape, same print/personalise/observation-logging flow afterward. Only
 * ever reads a row the RLS policy already scopes to status='approved', so
 * there's no risk of copying something still under review.
 */
export async function copyLibraryActivityToMine(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) throw new Error("No active service membership");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");

  const { data: source, error: fetchError } = await supabase
    .from("shared_library_activities")
    .select("*")
    .eq("id", id)
    .eq("status", "approved")
    .single();

  if (fetchError || !source) throw new Error("Activity not found in the library");

  const { data: activity, error: insertError } = await supabase
    .from("generated_activities")
    .insert({
      owner_user_id: ownerUserId,
      title: source.title,
      summary: source.summary ?? "",
      steps: source.steps,
      materials_used: source.materials_used,
      reflection_prompts: source.reflection_prompts,
      age_range: source.age_range,
      duration_minutes: source.duration_minutes,
      energy_level: source.energy_level,
      group_size_fit: source.group_size_fit,
      generation_mode: "shared_library",
      topic_tags: source.topic_tags,
      suggested_template: source.suggested_template as never,
      card_items: source.card_items,
      card_pairs: source.card_pairs,
      image_subject: source.image_subject,
      clipart_id: source.clipart_id,
      letter_text: source.letter_text,
      matching_left: source.matching_left,
      matching_right: source.matching_right,
      counting_groups: source.counting_groups,
      maze_start_emoji: source.maze_start_emoji,
      maze_end_emoji: source.maze_end_emoji,
      dot_to_dot_shape: source.dot_to_dot_shape,
      odd_one_out_same: source.odd_one_out_same,
      odd_one_out_different: source.odd_one_out_different,
      cut_and_sort_groups: source.cut_and_sort_groups,
    })
    .select("id")
    .single();

  if (insertError || !activity) throw new Error(insertError?.message ?? "Could not copy activity");

  if (source.eylf_codes.length > 0) {
    const { data: outcomes } = await supabase
      .from("eylf_outcomes")
      .select("id, code")
      .in("code", source.eylf_codes);
    if (outcomes && outcomes.length > 0) {
      await supabase.from("activity_eylf_links").insert(
        outcomes.map((o) => ({ activity_id: activity.id, eylf_outcome_id: o.id })),
      );
    }
  }

  redirect(`/activities/${activity.id}`);
}
