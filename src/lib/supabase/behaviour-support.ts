import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

export type BehaviourSupportPlan =
  Database["public"]["Tables"]["behaviour_support_plans"]["Row"];
export type BehaviourPlanFamilyResponse =
  Database["public"]["Tables"]["behaviour_plan_family_responses"]["Row"];

export type BSPStatus = BehaviourSupportPlan["status"];
export type BehaviourFrequency = BehaviourSupportPlan["behaviour_frequency"];

export const STATUS_LABELS: Record<BSPStatus, string> = {
  draft: "Draft",
  active: "Active",
  under_review: "Under Review",
  archived: "Archived",
};

export const STATUS_COLOURS: Record<BSPStatus, string> = {
  draft: "bg-ink/5 text-ink/60",
  active: "bg-sage-light text-sage-dark",
  under_review: "bg-amber-light text-amber-dark",
  archived: "bg-ink/5 text-ink/40",
};

export const FREQUENCY_LABELS: Record<BehaviourFrequency, string> = {
  rarely: "Rarely (less than once a week)",
  sometimes: "Sometimes (a few times a week)",
  daily: "Daily",
  multiple_daily: "Multiple times a day",
};

export interface BSPWithChild extends BehaviourSupportPlan {
  child_first_name: string;
}

export async function getBehaviourSupportPlans(
  ownerUserId: string,
  childId?: string,
): Promise<BSPWithChild[]> {
  const supabase = await createClient();
  let q = supabase
    .from("behaviour_support_plans")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });
  if (childId) q = q.eq("child_id", childId);
  const { data: plans } = await q;
  if (!plans || plans.length === 0) return [];

  const childIds = [...new Set(plans.map((p) => p.child_id))];
  const { data: childRows } = await supabase
    .from("children")
    .select("id, first_name")
    .in("id", childIds);
  const nameMap = new Map((childRows ?? []).map((c) => [c.id, c.first_name]));

  return plans.map((p) => ({
    ...p,
    child_first_name: nameMap.get(p.child_id) ?? "Unknown",
  }));
}

export async function getBehaviourSupportPlan(
  id: string,
): Promise<BehaviourSupportPlan | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("behaviour_support_plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function getFamilyResponsesForPlan(
  planId: string,
): Promise<BehaviourPlanFamilyResponse[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("behaviour_plan_family_responses")
    .select("*")
    .eq("plan_id", planId)
    .order("created_at");
  return data ?? [];
}

// Parent-facing: reads via is_linked_parent RLS
export async function getBSPsForParent(childId: string): Promise<BehaviourSupportPlan[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("behaviour_support_plans")
    .select("*")
    .eq("child_id", childId)
    .in("status", ["active", "under_review"])
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getMyFamilyResponse(
  planId: string,
  parentUserId: string,
): Promise<BehaviourPlanFamilyResponse | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("behaviour_plan_family_responses")
    .select("*")
    .eq("plan_id", planId)
    .eq("parent_user_id", parentUserId)
    .maybeSingle();
  return data;
}
