"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function addFoodRecord(formData: FormData) {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  const childId = formData.get("child_id") as string;
  const date = formData.get("date") as string;
  const mealType = formData.get("meal_type") as string;
  const foodOffered = (formData.get("food_offered") as string).trim();
  const amountEaten = formData.get("amount_eaten") as string;
  const notes = (formData.get("notes") as string).trim() || null;

  if (!foodOffered) return;

  await supabase.from("daily_food").insert({
    owner_user_id: ownerUserId,
    child_id: childId,
    date,
    meal_type: mealType as "breakfast" | "morning_tea" | "lunch" | "afternoon_tea" | "late_snack" | "other",
    food_offered: foodOffered,
    amount_eaten: amountEaten as "all" | "most" | "half" | "little" | "none" | "na",
    notes,
  });

  revalidatePath(`/food?date=${date}`);
}

export async function deleteFoodRecord(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const date = formData.get("date") as string;

  await supabase.from("daily_food").delete().eq("id", id);

  revalidatePath(`/food?date=${date}`);
}
