"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function addClosure(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service" };

  const closureDate = formData.get("closure_date") as string;
  const closureType = (formData.get("closure_type") as string) || "public_holiday";
  const reason = (formData.get("reason") as string)?.trim() || null;
  const affectsCasualDays = formData.get("affects_casual_days") === "1";

  if (!closureDate) return { error: "Date is required" };

  const { error } = await supabase.from("service_closures").upsert({
    owner_user_id: ownerUserId,
    closure_date: closureDate,
    closure_type: closureType as never,
    reason,
    affects_casual_days: affectsCasualDays,
  }, { onConflict: "owner_user_id,closure_date" });

  if (error) return { error: error.message };
  revalidatePath("/closures");
  return {};
}

export async function deleteClosure(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service" };

  const { error } = await supabase.from("service_closures").delete().eq("id", id).eq("owner_user_id", ownerUserId);
  if (error) return { error: error.message };
  revalidatePath("/closures");
  return {};
}
