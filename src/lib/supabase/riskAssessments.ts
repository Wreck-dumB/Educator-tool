import { createClient } from "@/lib/supabase/server";
import type { RiskAssessment } from "@/lib/types/domain";

export interface RiskAssessmentWithActivity extends RiskAssessment {
  activity_title: string | null;
}

export async function getRiskAssessments(activityId?: string): Promise<RiskAssessmentWithActivity[]> {
  const supabase = await createClient();
  let query = supabase.from("risk_assessments").select("*").order("created_at", { ascending: false });
  if (activityId) {
    query = query.eq("activity_id", activityId);
  }
  const { data: assessments } = await query;
  if (!assessments || assessments.length === 0) return [];

  const { data: activities } = await supabase.from("generated_activities").select("id, title");
  const titleById = new Map((activities ?? []).map((a) => [a.id, a.title]));

  return assessments.map((a) => ({
    ...a,
    activity_title: a.activity_id ? titleById.get(a.activity_id) ?? null : null,
  }));
}

export async function getRiskAssessment(id: string): Promise<RiskAssessmentWithActivity | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("risk_assessments").select("*").eq("id", id).maybeSingle();
  if (!data) return null;

  let activity_title: string | null = null;
  if (data.activity_id) {
    const { data: activity } = await supabase
      .from("generated_activities")
      .select("title")
      .eq("id", data.activity_id)
      .maybeSingle();
    activity_title = activity?.title ?? null;
  }

  return { ...data, activity_title };
}
