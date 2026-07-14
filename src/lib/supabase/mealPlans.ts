import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export interface MealPlanSlotWithRecipe {
  id: string;
  plan_id: string;
  slot_date: string;
  meal_type: string;
  recipe_id: string | null;
  custom_title: string | null;
  recipe_title: string | null;
  recipe_ingredients: string[];
  recipe_allergens: string[];
}

export async function getOrCreateMealPlan(weekStartDate: string): Promise<string | null> {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return null;

  const { data: existing } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("owner_user_id", ownerUserId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("meal_plans")
    .insert({ owner_user_id: ownerUserId, week_start_date: weekStartDate })
    .select("id")
    .single();

  return created?.id ?? null;
}

export async function getMealPlanSlots(planId: string): Promise<MealPlanSlotWithRecipe[]> {
  const supabase = await createClient();
  const { data: slots } = await supabase
    .from("meal_plan_slots")
    .select("id, plan_id, slot_date, meal_type, recipe_id, custom_title")
    .eq("plan_id", planId)
    .order("slot_date")
    .order("meal_type");

  if (!slots || slots.length === 0) return [];

  const recipeIds = [...new Set(slots.map((s) => s.recipe_id).filter(Boolean))] as string[];
  const { data: recipes } =
    recipeIds.length > 0
      ? await supabase
          .from("recipes")
          .select("id, title, ingredients, allergens_present")
          .in("id", recipeIds)
      : { data: [] };

  const recipeMap = new Map((recipes ?? []).map((r) => [r.id, r]));

  return slots.map((slot) => {
    const recipe = slot.recipe_id ? recipeMap.get(slot.recipe_id) : null;
    return {
      ...slot,
      recipe_title: recipe?.title ?? null,
      recipe_ingredients: (recipe?.ingredients ?? []) as string[],
      recipe_allergens: (recipe?.allergens_present ?? []) as string[],
    };
  });
}
