import { createClient } from "@/lib/supabase/server";
import type { DevelopmentalMilestone } from "@/lib/types/domain";

export async function getDevelopmentalMilestones(): Promise<DevelopmentalMilestone[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("developmental_milestones")
    .select("*")
    .order("age_band_order")
    .order("domain");
  return data ?? [];
}
