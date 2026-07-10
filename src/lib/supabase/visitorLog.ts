import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

export type VisitorLogRow = Database["public"]["Tables"]["visitor_log"]["Row"];

export async function getVisitorLog(limit = 50): Promise<VisitorLogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("visitor_log")
    .select("*")
    .order("signed_in_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getCurrentlyOnsiteVisitors(): Promise<VisitorLogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("visitor_log")
    .select("*")
    .is("signed_out_at", null)
    .order("signed_in_at");
  return data ?? [];
}
