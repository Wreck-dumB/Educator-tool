"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function addClosure(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/onboarding");

  const closureDate = formData.get("closure_date") as string;
  const closureType = (formData.get("closure_type") as string) || "public_holiday";
  const reason = (formData.get("reason") as string)?.trim() || null;
  const affectsCasualDays = formData.get("affects_casual_days") === "1";

  if (!closureDate) redirect("/closures?error=" + encodeURIComponent("Date is required"));

  const { error } = await supabase.from("service_closures").upsert({
    owner_user_id: ownerUserId,
    closure_date: closureDate,
    closure_type: closureType as never,
    reason,
    affects_casual_days: affectsCasualDays,
  }, { onConflict: "owner_user_id,closure_date" });

  if (error) redirect("/closures?error=" + encodeURIComponent(error.message));
  revalidatePath("/closures");
}

export async function deleteClosure(id: string): Promise<void> {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/onboarding");

  await supabase.from("service_closures").delete().eq("id", id).eq("owner_user_id", ownerUserId);
  revalidatePath("/closures");
}
