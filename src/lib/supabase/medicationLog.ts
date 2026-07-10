import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

export type MedicationLogRow = Database["public"]["Tables"]["medication_administration_log"]["Row"];

export async function getMedicationLog(limit = 50): Promise<MedicationLogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("medication_administration_log")
    .select("*")
    .order("administered_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getMedicationLogForChild(childId: string): Promise<MedicationLogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("medication_administration_log")
    .select("*")
    .eq("child_id", childId)
    .order("administered_at", { ascending: false });
  return data ?? [];
}
