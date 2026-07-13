"use server";

import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { upsertNqsStandardRating } from "@/lib/supabase/nqsAssessments";
import { createClient } from "@/lib/supabase/server";

export async function saveNqsRating(formData: FormData) {
  const assessmentId = formData.get("assessment_id") as string;
  const standardCode = formData.get("standard_code") as string;
  const rating = formData.get("rating") as "working_towards" | "meeting" | "exceeding";
  const evidenceNotes = (formData.get("evidence_notes") as string | null) || null;

  if (!assessmentId || !standardCode || !["working_towards", "meeting", "exceeding"].includes(rating)) {
    return;
  }

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  await upsertNqsStandardRating(assessmentId, ownerUserId, standardCode, rating, evidenceNotes);
}

export async function updateAssessmentNotes(formData: FormData) {
  const assessmentId = formData.get("assessment_id") as string;
  const notes = (formData.get("notes") as string | null) || null;

  if (!assessmentId) return;

  const supabase = await createClient();
  await supabase
    .from("nqs_self_assessments")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", assessmentId);
}
