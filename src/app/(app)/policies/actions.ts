"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PolicySuggestion } from "@/lib/types/domain";

export async function savePolicy(
  category: string,
  userInput: string,
  suggestion: PolicySuggestion,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("policies")
    .insert({
      owner_user_id: user.id,
      category,
      title: suggestion.title,
      your_input: userInput,
      purpose: suggestion.purpose,
      scope: suggestion.scope,
      procedure_steps: suggestion.procedureSteps,
      related_legislation: suggestion.relatedLegislation,
      suggested_additions: suggestion.suggestedAdditions,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save policy" };
  }

  revalidatePath("/policies");
  return { id: data.id };
}

export async function markPolicyReviewed(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("policies").update({ reviewed_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/policies");
}
