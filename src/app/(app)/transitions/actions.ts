"use server";

import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { redirect } from "next/navigation";

export async function saveTransitionStatement(formData: FormData) {
  const childId = formData.get("child_id") as string;
  const rawType = formData.get("transition_type") as string;
  const draftText = formData.get("draft_text") as string;
  const finalize = formData.get("finalize") === "1";

  if (!childId || !rawType || !draftText?.trim()) return;
  if (!["to_school", "between_rooms", "between_services"].includes(rawType)) return;
  const transitionType = rawType as "to_school" | "between_rooms" | "between_services";

  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("transition_statements").upsert(
    {
      owner_user_id: ownerUserId,
      child_id: childId,
      transition_type: transitionType,
      draft_text: draftText.trim(),
      finalized_at: finalize ? new Date().toISOString() : null,
      finalized_by: finalize ? user.id : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_user_id,child_id,transition_type" },
  );

  redirect("/transitions");
}

export async function deleteTransitionStatement(id: string) {
  const supabase = await createClient();
  await supabase.from("transition_statements").delete().eq("id", id);
  redirect("/transitions");
}
