import { createClient } from "@/lib/supabase/server";
import type { Recipe } from "@/lib/types/domain";

export async function getRecipes(): Promise<Recipe[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("recipes").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}
