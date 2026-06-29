import { createClient } from "@/lib/supabase/server";
import type { NqsStandard, QualityImprovementPlan, QipItem } from "@/lib/types/domain";

export async function getNqsStandards(): Promise<NqsStandard[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("nqs_standards").select("*").order("code");
  return data ?? [];
}

/** Fetches the current user's single QIP, creating an empty one on first visit. */
export async function getOrCreateQip(): Promise<QualityImprovementPlan | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("quality_improvement_plans")
    .select("*")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (existing) return existing;

  const { data: created } = await supabase
    .from("quality_improvement_plans")
    .insert({ owner_user_id: user.id })
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
