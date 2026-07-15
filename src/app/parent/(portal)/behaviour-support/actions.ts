"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function submitFamilyResponse(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const planId = formData.get("plan_id") as string;
  const childId = formData.get("child_id") as string;
  const familyStrategies = ((formData.get("family_strategies") as string) ?? "").trim();
  const homeContext = ((formData.get("home_context") as string) ?? "").trim();
  const acknowledged = formData.get("acknowledged") === "1";

  if (!planId || !childId) return;

  const existing = await supabase
    .from("behaviour_plan_family_responses")
    .select("id")
    .eq("plan_id", planId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (existing.data) {
    await supabase
      .from("behaviour_plan_family_responses")
      .update({
        family_strategies: familyStrategies,
        home_context: homeContext,
        acknowledged,
        acknowledged_at: acknowledged ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.data.id);
  } else {
    await supabase.from("behaviour_plan_family_responses").insert({
      plan_id: planId,
      child_id: childId,
      parent_user_id: user.id,
      family_strategies: familyStrategies,
      home_context: homeContext,
      acknowledged,
      acknowledged_at: acknowledged ? new Date().toISOString() : null,
    });
  }

  revalidatePath("/parent/behaviour-support");
}
