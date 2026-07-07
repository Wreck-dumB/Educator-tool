import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

export type DailySleep = Database["public"]["Tables"]["daily_sleep"]["Row"];
export type DailyFood = Database["public"]["Tables"]["daily_food"]["Row"];
export type DailyNappy = Database["public"]["Tables"]["daily_nappy"]["Row"];

export async function getSleepForDate(date: string): Promise<DailySleep[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_sleep")
    .select("*")
    .eq("date", date)
    .order("sleep_start", { ascending: true });
  return data ?? [];
}

export async function getFoodForDate(date: string): Promise<DailyFood[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_food")
    .select("*")
    .eq("date", date)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getNappyForDate(date: string): Promise<DailyNappy[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_nappy")
    .select("*")
    .eq("date", date)
    .order("changed_at", { ascending: true });
  return data ?? [];
}
