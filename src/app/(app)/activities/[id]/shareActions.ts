"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getActivity } from "@/lib/supabase/activities";
import { reviewSharedWorksheet } from "@/lib/anthropic";
import { findEnrolledChildNameMentions } from "@/lib/childNameGuard";
import { isRateLimited } from "@/lib/rateLimit";

/**
 * Submits one of the service's own saved activities to the cross-tenant
 * shared library. Two independent safety checks run before anything is
 * visible to another service, in order: a deterministic regex check against
 * this service's own enrolled children's names (cheap, certain, no AI call
 * needed if it catches something), then an AI review for copyright
 * infringement and any other personal/identifying information. Only after
 * BOTH pass does the submission move to pending_admin_review — a human
 * platform-owner decision is still required before it's visible to anyone
 * else, this function never grants that itself.
 *
 * Deliberately fails CLOSED, unlike most AI calls in this app: if the review
 * call itself errors, the submission is left flagged rather than silently
 * approved — a failed safety check blocking a share is a far better outcome
 * than a skipped one letting something unreviewed through.
 */
export async function shareActivityToLibrary(activityId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (await isRateLimited(`share-library:${user.id}`, 10, 60 * 60 * 1000)) {
    return { error: "You've submitted a lot of activities recently — try again in an hour." };
  }

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service membership" };

  const activity = await getActivity(activityId);
  if (!activity) return { error: "Activity not found" };

  const reviewText = [
    activity.title,
    activity.summary,
    ...activity.steps,
    ...activity.materials_used,
    ...activity.reflection_prompts,
    activity.image_subject,
    activity.letter_text,
  ]
    .filter(Boolean)
    .join("\n");

  // Insert first as pending_ai_review (the only status RLS allows a normal
  // user to insert as), then advance it in a follow-up update — matches the
  // migration's two-step INSERT/UPDATE policy split.
  const { data: inserted, error: insertError } = await supabase
    .from("shared_library_activities")
    .insert({
      origin_owner_user_id: ownerUserId,
      source_activity_id: activity.id,
      title: activity.title,
      summary: activity.summary,
      steps: activity.steps,
      materials_used: activity.materials_used,
      reflection_prompts: activity.reflection_prompts,
      age_range: activity.age_range,
      duration_minutes: activity.duration_minutes,
      energy_level: activity.energy_level,
      group_size_fit: activity.group_size_fit,
      eylf_codes: activity.eylf_codes,
      topic_tags: activity.topic_tags,
      suggested_template: activity.suggested_template,
      card_items: activity.card_items,
      card_pairs: activity.card_pairs,
      image_subject: activity.image_subject,
      clipart_id: activity.clipart_id,
      letter_text: activity.letter_text,
      matching_left: activity.matching_left,
      matching_right: activity.matching_right,
      counting_groups: activity.counting_groups,
      maze_start_emoji: activity.maze_start_emoji,
      maze_end_emoji: activity.maze_end_emoji,
      dot_to_dot_shape: activity.dot_to_dot_shape,
      odd_one_out_same: activity.odd_one_out_same,
      odd_one_out_different: activity.odd_one_out_different,
      cut_and_sort_groups: activity.cut_and_sort_groups,
      status: "pending_ai_review",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: insertError?.message ?? "Could not submit to the library" };
  }

  const submissionId = inserted.id;

  const enrolledNameMatches = await findEnrolledChildNameMentions(reviewText);
  if (enrolledNameMatches.length > 0) {
    await supabase
      .from("shared_library_activities")
      .update({
        status: "ai_flagged",
        ai_review_notes: "Contains an enrolled child's name — remove any specific child's name before sharing.",
        ai_reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
    revalidatePath(`/activities/${activityId}`);
    return { error: "This activity mentions an enrolled child's name and can't be shared as-is." };
  }

  try {
    const review = await reviewSharedWorksheet({
      title: activity.title,
      summary: activity.summary,
      steps: activity.steps,
      materials_used: activity.materials_used,
      reflection_prompts: activity.reflection_prompts,
      image_subject: activity.image_subject,
      letter_text: activity.letter_text,
    });

    if (review.verdict === "flagged") {
      await supabase
        .from("shared_library_activities")
        .update({
          status: "ai_flagged",
          ai_review_notes: review.reasoning,
          ai_reviewed_at: new Date().toISOString(),
        })
        .eq("id", submissionId);
      revalidatePath(`/activities/${activityId}`);
      return { error: `Automated review flagged this: ${review.reasoning}` };
    }

    await supabase
      .from("shared_library_activities")
      .update({
        status: "pending_admin_review",
        ai_review_notes: review.reasoning,
        ai_reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
  } catch (err) {
    console.error("reviewSharedWorksheet failed - leaving submission flagged rather than unreviewed", err);
    await supabase
      .from("shared_library_activities")
      .update({
        status: "ai_flagged",
        ai_review_notes: "Automated review couldn't complete — please try submitting again shortly.",
        ai_reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
    revalidatePath(`/activities/${activityId}`);
    return { error: "Automated review couldn't complete — please try again shortly." };
  }

  revalidatePath(`/activities/${activityId}`);
  return { ok: true };
}
