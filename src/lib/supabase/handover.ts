import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

export type HandoverRow = Database["public"]["Tables"]["shift_handover_notes"]["Row"];

export async function getHandoverNotes(limit = 14): Promise<HandoverRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shift_handover_notes")
    .select("*")
    .order("shift_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getTodayHandoverNotes(): Promise<HandoverRow[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("shift_handover_notes")
    .select("*")
    .eq("shift_date", today)
    .order("created_at");
  return data ?? [];
}
