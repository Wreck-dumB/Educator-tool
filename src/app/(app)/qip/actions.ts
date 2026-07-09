"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import type { QipItemSuggestion } from "@/lib/types/domain";
import { redirect } from "next/navigation";
import type { QipItemStatus, QipCheckinResponse } from "@/lib/types/database.types";

export async function saveQipItems(
  qipId: string,
  items: QipItemSuggestion[],
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service membership" };

  const { error } = await supabase.from("qip_items").insert(
    items.map((item) => ({
      qip_id: qipId,
      owner_user_id: ownerUserId,
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

export async function saveQipCheckin(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/qip/checkin");

  const checkinDate = (formData.get("checkin_date") as string) || new Date().toISOString().slice(0, 10);
  const overallNotes = (formData.get("overall_notes") as string)?.trim() || null;

  const QA_QUESTIONS: Record<number, string> = {
    1: "Were observations and documentation recorded to reflect each child's learning and development today?",
    2: "Were all health and safety requirements met — supervision, hygiene, and incident response?",
    3: "Was the physical environment set up safely, inclusively, and with appropriate learning opportunities?",
    4: "Were staff-to-child ratios maintained and were all planned learning activities supported?",
    5: "Did educators foster warm, respectful, and responsive relationships with every child today?",
    6: "Were families greeted, informed, and any messages or concerns acted on today?",
    7: "Were all records, policies, and regulatory compliance requirements met today?",
  };

  const responses: QipCheckinResponse[] = [];
  const flaggedAreas: number[] = [];

  for (let qa = 1; qa <= 7; qa++) {
    const answer = formData.get(`qa_${qa}_answer`) as "yes" | "mostly" | "no" | null;
    if (!answer) continue;
    const notes = (formData.get(`qa_${qa}_notes`) as string)?.trim() ?? "";
    responses.push({ qa, question: QA_QUESTIONS[qa], answer, notes });
    if (answer === "no") flaggedAreas.push(qa);
  }

  await supabase.from("qip_daily_checkins").upsert(
    {
      owner_user_id: ownerUserId,
      checkin_date: checkinDate,
      responses,
      overall_notes: overallNotes,
      submitted_by: user.id,
      flagged_areas: flaggedAreas,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_user_id,checkin_date" },
  );

  revalidatePath("/qip");
  revalidatePath("/qip/checkin");
  revalidatePath("/dashboard");
  const flagParam = flaggedAreas.length > 0 ? `&flagged=${flaggedAreas.join(",")}` : "";
  redirect(`/qip/checkin?date=${checkinDate}&saved=1${flagParam}`);
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
