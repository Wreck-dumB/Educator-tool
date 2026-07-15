"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import type { Database } from "@/lib/types/database.types";

type BSPStatus = Database["public"]["Tables"]["behaviour_support_plans"]["Row"]["status"];
type BehaviourFrequency =
  Database["public"]["Tables"]["behaviour_support_plans"]["Row"]["behaviour_frequency"];

export async function createBehaviourSupportPlan(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  const childId = formData.get("child_id") as string;
  const behaviourDescription = (formData.get("behaviour_description") as string)?.trim();
  if (!childId || !behaviourDescription) return;

  const { data, error } = await supabase
    .from("behaviour_support_plans")
    .insert({
      owner_user_id: ownerUserId,
      child_id: childId,
      created_by: user.id,
      status: ((formData.get("status") as BSPStatus) ?? "draft"),
      child_strengths: ((formData.get("child_strengths") as string) ?? "").trim(),
      child_interests: ((formData.get("child_interests") as string) ?? "").trim(),
      behaviour_description: behaviourDescription,
      behaviour_triggers: ((formData.get("behaviour_triggers") as string) ?? "").trim(),
      behaviour_frequency:
        ((formData.get("behaviour_frequency") as BehaviourFrequency) ?? "sometimes"),
      behaviour_function: ((formData.get("behaviour_function") as string) ?? "").trim(),
      educator_strategies: ((formData.get("educator_strategies") as string) ?? "").trim(),
      suggested_family_strategies:
        ((formData.get("suggested_family_strategies") as string) ?? "").trim(),
      environment_adjustments: ((formData.get("environment_adjustments") as string) ?? "").trim(),
      external_support_notes: ((formData.get("external_support_notes") as string) ?? "").trim(),
      review_date: (formData.get("review_date") as string) || null,
    })
    .select("id")
    .single();

  if (error || !data) return;
  redirect(`/behaviour-support/${data.id}`);
}

export async function updateBehaviourSupportPlan(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  if (!id) return;

  await supabase
    .from("behaviour_support_plans")
    .update({
      status: (formData.get("status") as BSPStatus) ?? "draft",
      child_strengths: ((formData.get("child_strengths") as string) ?? "").trim(),
      child_interests: ((formData.get("child_interests") as string) ?? "").trim(),
      behaviour_description: ((formData.get("behaviour_description") as string) ?? "").trim(),
      behaviour_triggers: ((formData.get("behaviour_triggers") as string) ?? "").trim(),
      behaviour_frequency:
        ((formData.get("behaviour_frequency") as BehaviourFrequency) ?? "sometimes"),
      behaviour_function: ((formData.get("behaviour_function") as string) ?? "").trim(),
      educator_strategies: ((formData.get("educator_strategies") as string) ?? "").trim(),
      suggested_family_strategies:
        ((formData.get("suggested_family_strategies") as string) ?? "").trim(),
      environment_adjustments: ((formData.get("environment_adjustments") as string) ?? "").trim(),
      external_support_notes: ((formData.get("external_support_notes") as string) ?? "").trim(),
      review_date: (formData.get("review_date") as string) || null,
      review_notes: ((formData.get("review_notes") as string) ?? "").trim() || null,
      last_reviewed_at:
        formData.get("mark_reviewed") === "1" ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath(`/behaviour-support/${id}`);
  revalidatePath("/behaviour-support");
}

export async function deleteBehaviourSupportPlan(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  if (!id) return;

  await supabase.from("behaviour_support_plans").delete().eq("id", id);
  redirect("/behaviour-support");
}
