"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RecipeSuggestion } from "@/lib/types/domain";

export async function saveRecipe(
  userInput: string,
  suggestion: RecipeSuggestion,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("recipes")
    .insert({
      owner_user_id: user.id,
      title: suggestion.title,
      description: suggestion.description,
      ingredients: suggestion.ingredients,
      steps: suggestion.steps,
      prep_time_minutes: suggestion.prepTimeMinutes,
      servings: suggestion.servings,
      age_range: suggestion.ageRange,
      dietary_tags: suggestion.dietaryTags,
      allergens_present: suggestion.allergensPresent,
      choking_hazard_notes: suggestion.chokingHazardNotes,
      your_input: userInput,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save recipe" };
  }

  revalidatePath("/recipes");
  return { id: data.id };
}

export async function deleteRecipe(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  await supabase.from("recipes").delete().eq("id", id);

  revalidatePath("/recipes");
}
