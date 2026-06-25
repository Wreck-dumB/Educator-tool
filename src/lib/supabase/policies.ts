import { createClient } from "@/lib/supabase/server";
import type { Policy } from "@/lib/types/domain";

export async function getPolicies(): Promise<Policy[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("policies").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function getPolicy(id: string): Promise<Policy | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("policies").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}
