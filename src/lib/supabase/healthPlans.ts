import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { decryptField } from "@/lib/encryption";
import type { Database } from "@/lib/types/database.types";

export type HealthPlan = Database["public"]["Tables"]["child_health_plans"]["Row"];

// triggers/signs_and_symptoms/emergency_steps/emergency_medication may be
// encrypted at rest (see lib/encryption.ts) — every read path must decrypt
// before use. This is an emergency medical plan, so decrypt failures fall
// open (return the raw stored value) rather than throwing — see decryptField.
function decryptHealthPlan<T extends HealthPlan>(plan: T): T {
  return {
    ...plan,
    triggers: decryptField(plan.triggers),
    signs_and_symptoms: decryptField(plan.signs_and_symptoms),
    emergency_steps: decryptField(plan.emergency_steps) ?? plan.emergency_steps,
    emergency_medication: decryptField(plan.emergency_medication),
  };
}

export async function getHealthPlans(): Promise<HealthPlan[]> {
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("child_health_plans")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .eq("is_active", true)
    .order("review_date", { ascending: true, nullsFirst: false });
  return (data ?? []).map(decryptHealthPlan);
}

export async function getHealthPlansByChild(childId: string): Promise<HealthPlan[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("child_health_plans")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(decryptHealthPlan);
}

// Plans expiring within `days` days (for dashboard alerts).
export async function getExpiringHealthPlans(days = 30): Promise<(HealthPlan & { child_first_name: string })[]> {
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return [];
  const supabase = await createClient();
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: plans } = await supabase
    .from("child_health_plans")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .eq("is_active", true)
    .not("review_date", "is", null)
    .lte("review_date", cutoff)
    .order("review_date", { ascending: true });

  if (!plans || plans.length === 0) return [];

  const childIds = [...new Set(plans.map((p) => p.child_id))];
  const { data: children } = await supabase
    .from("children")
    .select("id, first_name")
    .in("id", childIds);
  const childMap = new Map((children ?? []).map((c) => [c.id, c.first_name]));

  return plans.map((p) => ({ ...decryptHealthPlan(p), child_first_name: childMap.get(p.child_id) ?? "Unknown" }));
}
