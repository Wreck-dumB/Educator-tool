import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/types/database.types";

export type SharedLibraryActivity = Database["public"]["Tables"]["shared_library_activities"]["Row"];

// Fields copied out of a generated_activities row when submitting to the
// library — deliberately excludes generation_mode, is_archived, and anything
// else that's an internal/private-service concern rather than reusable
// content.
export const SHAREABLE_FIELDS = [
  "title", "summary", "steps", "materials_used", "reflection_prompts",
  "age_range", "duration_minutes", "energy_level", "group_size_fit",
  "topic_tags", "suggested_template", "card_items", "card_pairs",
  "image_subject", "clipart_id", "letter_text", "matching_left", "matching_right",
  "counting_groups", "maze_start_emoji", "maze_end_emoji", "dot_to_dot_shape",
  "odd_one_out_same", "odd_one_out_different", "cut_and_sort_groups",
] as const;

/** A service's own submissions, any status — for tracking review progress. */
export async function getMySubmissions(): Promise<SharedLibraryActivity[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shared_library_activities")
    .select("*")
    .order("submitted_at", { ascending: false });
  return data ?? [];
}

/** The most recent submission for one specific source activity, if any — for the "Share" button's status display. */
export async function getSubmissionForActivity(activityId: string): Promise<SharedLibraryActivity | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shared_library_activities")
    .select("*")
    .eq("source_activity_id", activityId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export interface LibrarySearchParams {
  topicTags?: string[];
  eylfCodes?: string[];
  query?: string;
}

// Public browse/search — approved entries only, and deliberately never
// selects origin_owner_user_id so no other service's identity leaks into
// the shared view even by accident of a future UI change.
const PUBLIC_COLUMNS =
  "id, title, summary, steps, materials_used, reflection_prompts, age_range, duration_minutes, " +
  "energy_level, group_size_fit, eylf_codes, topic_tags, suggested_template, card_items, card_pairs, " +
  "image_subject, clipart_id, letter_text, matching_left, matching_right, counting_groups, " +
  "maze_start_emoji, maze_end_emoji, dot_to_dot_shape, odd_one_out_same, odd_one_out_different, " +
  "cut_and_sort_groups, approved_at:admin_reviewed_at";

export async function searchApprovedLibrary(params: LibrarySearchParams): Promise<Omit<SharedLibraryActivity, "origin_owner_user_id" | "ai_review_notes" | "admin_reviewed_by" | "admin_rejection_reason">[]> {
  const supabase = await createClient();
  let q = supabase.from("shared_library_activities").select(PUBLIC_COLUMNS).eq("status", "approved");

  if (params.topicTags && params.topicTags.length > 0) {
    q = q.overlaps("topic_tags", params.topicTags);
  }
  if (params.eylfCodes && params.eylfCodes.length > 0) {
    q = q.overlaps("eylf_codes", params.eylfCodes);
  }
  if (params.query && params.query.trim()) {
    q = q.ilike("title", `%${params.query.trim()}%`);
  }

  const { data } = await q.order("admin_reviewed_at", { ascending: false }).limit(60);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []) as any;
}

/** Platform-owner only — everything awaiting a human decision. Caller must verify isPlatformOwner() first. */
export async function getPendingAdminReview(): Promise<SharedLibraryActivity[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("shared_library_activities")
    .select("*")
    .eq("status", "pending_admin_review")
    .order("submitted_at", { ascending: true });
  return data ?? [];
}
