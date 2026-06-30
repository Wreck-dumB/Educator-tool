import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import type { NqsStandard, QualityImprovementPlan, QipItem } from "@/lib/types/domain";

export async function getNqsStandards(): Promise<NqsStandard[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("nqs_standards").select("*").order("code");
  return data ?? [];
}

/**
 * Fetches the current service's single QIP, creating an empty one on first
 * visit. Resolves "my service" via getMyServiceOwnerId() rather than
 * filtering by owner_user_id = my own auth.uid() -- a 2IC or staff member's
 * own id is never the QIP's owner_user_id (that's always the Director's).
 */
export async function getOrCreateQip(): Promise<QualityImprovementPlan | null> {
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return null;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("quality_improvement_plans")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  if (existing) return existing;

  const { data: created } = await supabase
    .from("quality_improvement_plans")
    .insert({ owner_user_id: ownerUserId })
    .select("*")
    .single();

  return created ?? null;
}

export async function getQipItems(qipId: string): Promise<QipItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("qip_items")
    .select("*")
    .eq("qip_id", qipId)
    .order("quality_area_number")
    .order("created_at");
  return data ?? [];
}
