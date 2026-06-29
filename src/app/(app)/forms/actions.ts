"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormTemplateSuggestion } from "@/lib/types/domain";

export async function saveFormTemplate(
  category: string,
  userInput: string,
  suggestion: FormTemplateSuggestion,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("form_templates")
    .insert({
      owner_user_id: user.id,
      category,
      title: suggestion.title,
      your_input: userInput,
      purpose: suggestion.purpose,
      fields_to_complete: suggestion.fieldsToComplete,
      body_text: suggestion.bodyText,
      requires_signature: suggestion.requiresSignature,
      suggested_additions: suggestion.suggestedAdditions,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save form template" };
  }

  revalidatePath("/forms");
  return { id: data.id };
}

export async function deleteFormTemplate(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  await supabase.from("form_templates").delete().eq("id", id);

  revalidatePath("/forms");
}
