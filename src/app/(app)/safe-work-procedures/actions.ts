"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SafeWorkProcedureSuggestion } from "@/lib/types/domain";

export async function saveSafeWorkProcedure(
  taskTitle: string,
  taskDescription: string,
  suggestion: SafeWorkProcedureSuggestion,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("safe_work_procedures")
    .insert({
      owner_user_id: user.id,
      task_title: taskTitle,
      task_description: taskDescription,
      ppe_required: suggestion.ppeRequired,
      steps: suggestion.steps,
      hazards: suggestion.hazards,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save safe work procedure" };
  }

  revalidatePath("/safe-work-procedures");
  return { id: data.id };
}

export async function markSafeWorkProcedureReviewed(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("safe_work_procedures").update({ reviewed_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/safe-work-procedures");
}
