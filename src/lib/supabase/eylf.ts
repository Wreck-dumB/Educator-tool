import { createClient } from "@/lib/supabase/server";
import type { EylfOutcome } from "@/lib/types/domain";

export async function getEylfOutcomes(): Promise<EylfOutcome[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("eylf_outcomes").select("*").order("code");
  return data ?? [];
}
