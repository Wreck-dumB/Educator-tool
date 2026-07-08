"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function createHealthPlan(formData: FormData) {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/");

  const reviewDateRaw = formData.get("review_date") as string | null;

  const { error } = await supabase.from("child_health_plans").insert({
    owner_user_id: ownerUserId,
    child_id: formData.get("child_id") as string,
    plan_type: formData.get("plan_type") as "asthma" | "anaphylaxis" | "diabetes" | "allergies" | "epilepsy" | "other",
    plan_name: formData.get("plan_name") as string,
    triggers: (formData.get("triggers") as string) || null,
    signs_and_symptoms: (formData.get("signs_and_symptoms") as string) || null,
    emergency_steps: formData.get("emergency_steps") as string,
    emergency_medication: (formData.get("emergency_medication") as string) || null,
    review_date: reviewDateRaw || null,
  });

  if (error) redirect(`/health-plans?error=${encodeURIComponent(error.message)}`);
  redirect("/health-plans");
}

export async function updateHealthPlan(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const reviewDateRaw = formData.get("review_date") as string | null;

  const { error } = await supabase
    .from("child_health_plans")
    .update({
      plan_name: formData.get("plan_name") as string,
      plan_type: formData.get("plan_type") as "asthma" | "anaphylaxis" | "diabetes" | "allergies" | "epilepsy" | "other",
      triggers: (formData.get("triggers") as string) || null,
      signs_and_symptoms: (formData.get("signs_and_symptoms") as string) || null,
      emergency_steps: formData.get("emergency_steps") as string,
      emergency_medication: (formData.get("emergency_medication") as string) || null,
      review_date: reviewDateRaw || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) redirect(`/health-plans?error=${encodeURIComponent(error.message)}`);
  redirect("/health-plans");
}

export async function archiveHealthPlan(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  await supabase.from("child_health_plans").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
  redirect("/health-plans");
}
