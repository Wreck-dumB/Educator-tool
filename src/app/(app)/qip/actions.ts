"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { QipItemSuggestion } from "@/lib/types/domain";
import type { QipItemStatus } from "@/lib/types/database.types";

export async function saveQipItems(
  qipId: string,
  items: QipItemSuggestion[],
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("qip_items").insert(
    items.map((item) => ({
      qip_id: qipId,
      owner_user_id: user.id,
      quality_area_number: item.qualityAreaNumber,
      standard_code: item.standardCode,
      item_type: item.itemType,
      description: item.description,
      priority: item.priority,
      success_measure: item.successMeasure,
      steps: item.steps,
      timeframe: item.timeframe,
    })),
  );

  if (error) return { error: error.message };

  revalidatePath("/qip");
  return { ok: true };
}

export async function updateQipItemStatus(formData: FormData) {
  const supabase = await createClient();
  const itemId = formData.get("item_id") as string;
  const status = formData.get("status") as QipItemStatus;

  await supabase.from("qip_items").update({ status, updated_at: new Date().toISOString() }).eq("id", itemId);

  revalidatePath("/qip");
}

export async function deleteQipItem(formData: FormData) {
  const supabase = await createClient();
  const itemId = formData.get("item_id") as string;

  await supabase.from("qip_items").delete().eq("id", itemId);

  revalidatePath("/qip");
}

export async function updateQipContextNotes(formData: FormData) {
  const supabase = await createClient();
  const qipId = formData.get("qip_id") as string;
  const contextNotes = (formData.get("context_notes") as string)?.trim() || null;

  await supabase
    .from("quality_improvement_plans")
    .update({ context_notes: contextNotes, updated_at: new Date().toISOString() })
    .eq("id", qipId);

  revalidatePath("/qip");
}
