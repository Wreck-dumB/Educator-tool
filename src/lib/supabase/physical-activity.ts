import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

export type PhysicalActivityLog =
  Database["public"]["Tables"]["physical_activity_logs"]["Row"];
export type NutritionEducationLog =
  Database["public"]["Tables"]["nutrition_education_logs"]["Row"];

export type ActivityCategory = PhysicalActivityLog["activity_category"];
export type NutritionActivityType = NutritionEducationLog["activity_type"];

export const MOVEMENT_SKILLS = [
  "running",
  "jumping",
  "hopping",
  "skipping",
  "galloping",
  "throwing",
  "catching",
  "kicking",
  "striking",
  "balancing",
] as const;

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  fundamental_movement: "Fundamental Movement Skills",
  structured_game: "Structured Game",
  dance: "Dance & Movement",
  outdoor_play: "Outdoor Play",
  yoga_mindfulness: "Yoga & Mindfulness",
  water_play: "Water Play",
  other: "Other",
};

export const NUTRITION_TYPE_LABELS: Record<NutritionActivityType, string> = {
  cooking: "Cooking / Food Preparation",
  growing: "Growing Food",
  tasting: "Tasting Experience",
  food_art: "Food Art",
  nutrition_discussion: "Nutrition Discussion",
  sensory_exploration: "Sensory Exploration",
  other: "Other",
};

export async function getPhysicalActivityForDate(
  ownerUserId: string,
  date: string,
): Promise<PhysicalActivityLog[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("physical_activity_logs")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .eq("date", date)
    .order("logged_at");
  return data ?? [];
}

export async function getNutritionEducationForDate(
  ownerUserId: string,
  date: string,
): Promise<NutritionEducationLog[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("nutrition_education_logs")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .eq("date", date)
    .order("logged_at");
  return data ?? [];
}

export async function getWeeklyActivitySummary(
  ownerUserId: string,
  weekStart: string,
  weekEnd: string,
): Promise<{ child_id: string; total_minutes: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("physical_activity_logs")
    .select("child_id, duration_minutes")
    .eq("owner_user_id", ownerUserId)
    .gte("date", weekStart)
    .lte("date", weekEnd);

  if (!data) return [];

  const totals = new Map<string, number>();
  for (const row of data) {
    totals.set(row.child_id, (totals.get(row.child_id) ?? 0) + row.duration_minutes);
  }
  return Array.from(totals.entries()).map(([child_id, total_minutes]) => ({
    child_id,
    total_minutes,
  }));
}

// Parent-facing: reads via is_linked_parent RLS
export async function getPhysicalActivityForParent(
  childId: string,
  date: string,
): Promise<PhysicalActivityLog[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("physical_activity_logs")
    .select("*")
    .eq("child_id", childId)
    .eq("date", date)
    .order("logged_at");
  return data ?? [];
}

export async function getNutritionEducationForParent(
  childId: string,
  date: string,
): Promise<NutritionEducationLog[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("nutrition_education_logs")
    .select("*")
    .eq("child_id", childId)
    .eq("date", date)
    .order("logged_at");
  return data ?? [];
}
