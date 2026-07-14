"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type MealType = Database["public"]["Tables"]["meal_plan_slots"]["Row"]["meal_type"];

export async function upsertMealPlanSlot(formData: FormData) {
  const supabase = await createClient();
  const planId = formData.get("plan_id") as string;
  const slotDate = formData.get("slot_date") as string;
  const mealType = formData.get("meal_type") as MealType;
  const recipeId = (formData.get("recipe_id") as string) || null;
  const customTitle = (formData.get("custom_title") as string)?.trim() || null;

  if (!planId || !slotDate || !mealType) return;

  if (!recipeId && !customTitle) {
    await supabase
      .from("meal_plan_slots")
      .delete()
      .eq("plan_id", planId)
      .eq("slot_date", slotDate)
      .eq("meal_type", mealType);
  } else {
    await supabase.from("meal_plan_slots").upsert(
      { plan_id: planId, slot_date: slotDate, meal_type: mealType, recipe_id: recipeId, custom_title: customTitle },
      { onConflict: "plan_id,slot_date,meal_type" },
    );
  }

  revalidatePath("/recipes/meal-planner");
}

export async function deleteMealPlanSlot(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  if (!id) return;
  await supabase.from("meal_plan_slots").delete().eq("id", id);
  revalidatePath("/recipes/meal-planner");
}

export async function batchUpsertMealPlanSlots(
  planId: string,
  slots: { slotDate: string; mealType: string; recipeId: string | null; customTitle: string | null }[],
) {
  const supabase = await createClient();
  if (slots.length === 0) return;
  await supabase.from("meal_plan_slots").upsert(
    slots.map((s) => ({
      plan_id: planId,
      slot_date: s.slotDate,
      meal_type: s.mealType as MealType,
      recipe_id: s.recipeId,
      custom_title: s.customTitle,
    })),
    { onConflict: "plan_id,slot_date,meal_type" },
  );
  revalidatePath("/recipes/meal-planner");
}
