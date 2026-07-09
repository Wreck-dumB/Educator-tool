"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function addComplianceRecord(formData: FormData) {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/dashboard");

  const staffUserId = formData.get("staff_user_id") as string;
  const complianceType = formData.get("compliance_type") as
    | "wwcc" | "first_aid" | "anaphylaxis" | "asthma"
    | "child_protection" | "fire_safety" | "food_safety" | "other";
  const label = (formData.get("label") as string)?.trim();
  const referenceNumber = (formData.get("reference_number") as string)?.trim() || null;
  const issuedDate = (formData.get("issued_date") as string) || null;
  const expiryDate = (formData.get("expiry_date") as string) || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!staffUserId || !complianceType || !label) {
    redirect("/compliance?error=Missing+required+fields");
  }

  const { error } = await supabase.from("staff_compliance").insert({
    owner_user_id: ownerUserId,
    staff_user_id: staffUserId,
    compliance_type: complianceType,
    label,
    reference_number: referenceNumber,
    issued_date: issuedDate,
    expiry_date: expiryDate,
    notes,
  });

  if (error) redirect(`/compliance?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/compliance");
  revalidatePath("/dashboard");
  redirect("/compliance");
}

export async function deleteComplianceRecord(id: string) {
  const supabase = await createClient();
  await supabase.from("staff_compliance").delete().eq("id", id);
  revalidatePath("/compliance");
}
