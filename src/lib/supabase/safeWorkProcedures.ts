import { createClient } from "@/lib/supabase/server";
import type { SafeWorkProcedure } from "@/lib/types/domain";

export async function getSafeWorkProcedures(): Promise<SafeWorkProcedure[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("safe_work_procedures")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getSafeWorkProcedure(id: string): Promise<SafeWorkProcedure | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("safe_work_procedures").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}
