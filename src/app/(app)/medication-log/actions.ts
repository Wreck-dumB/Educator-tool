"use server";

import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { MedicationRoute, AuthorisationMethod } from "@/lib/types/database.types";

export async function logMedication(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/staff/onboard");

  const childId = formData.get("child_id") as string;
  const medicationName = formData.get("medication_name") as string;
  const dose = formData.get("dose") as string;
  const route = formData.get("route") as MedicationRoute;
  const administeredAt = formData.get("administered_at") as string;
  const parentAuthorised = formData.get("parent_authorised") === "yes";
  const authorisedByName = (formData.get("authorised_by_name") as string) || null;
  const authorisationMethod = (formData.get("authorisation_method") as AuthorisationMethod) || null;
  const reason = (formData.get("reason") as string) || null;
  const observationsAfter = (formData.get("observations_after") as string) || null;
  const nextDoseDue = (formData.get("next_dose_due") as string) || null;
  const witnessedByUserId = (formData.get("witnessed_by_user_id") as string) || null;

  if (!childId || !medicationName || !dose || !route || !administeredAt) {
    redirect("/medication-log?error=Required+fields+missing");
  }

  const { error } = await supabase.from("medication_administration_log").insert({
    owner_user_id: ownerUserId,
    child_id: childId,
    medication_name: medicationName,
    dose,
    route,
    administered_at: administeredAt,
    administered_by_user_id: user.id,
    parent_authorised: parentAuthorised,
    authorised_by_name: authorisedByName,
    authorisation_method: authorisationMethod,
    reason,
    observations_after: observationsAfter,
    next_dose_due: nextDoseDue || null,
    witnessed_by_user_id: witnessedByUserId || null,
  });

  if (error) redirect(`/medication-log?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/medication-log");
  redirect("/medication-log");
}

export async function deleteMedicationLog(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("medication_administration_log").delete().eq("id", id);
  revalidatePath("/medication-log");
}
