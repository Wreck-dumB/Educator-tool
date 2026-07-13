import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import type { NqsStandard } from "@/lib/types/domain";

export interface NqsSelfAssessment {
  id: string;
  owner_user_id: string;
  period_label: string;
  notes: string | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NqsStandardRating {
  id: string;
  assessment_id: string;
  owner_user_id: string;
  standard_code: string;
  rating: "working_towards" | "meeting" | "exceeding";
  evidence_notes: string | null;
  updated_at: string;
}

export async function getOrCreateNqsAssessment(): Promise<NqsSelfAssessment | null> {
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return null;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("nqs_self_assessments")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as NqsSelfAssessment;

  const { data: created } = await supabase
    .from("nqs_self_assessments")
    .insert({ owner_user_id: ownerUserId, period_label: "Annual Self-Assessment" })
    .select("*")
    .single();

  return (created as NqsSelfAssessment) ?? null;
}

export async function getNqsStandardRatings(assessmentId: string): Promise<NqsStandardRating[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("nqs_standard_ratings")
    .select("*")
    .eq("assessment_id", assessmentId);
  return (data ?? []) as NqsStandardRating[];
}

export async function upsertNqsStandardRating(
  assessmentId: string,
  ownerUserId: string,
  standardCode: string,
  rating: "working_towards" | "meeting" | "exceeding",
  evidenceNotes: string | null,
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("nqs_standard_ratings").upsert(
    {
      assessment_id: assessmentId,
      owner_user_id: ownerUserId,
      standard_code: standardCode,
      rating,
      evidence_notes: evidenceNotes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "assessment_id,standard_code" },
  );
}

export interface NqsAssessmentWithRatings {
  assessment: NqsSelfAssessment;
  standards: NqsStandard[];
  ratings: Record<string, NqsStandardRating>;
}
