"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function createExcursion(formData: FormData) {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/");

  const { data, error } = await supabase
    .from("excursions")
    .insert({
      owner_user_id: ownerUserId,
      title: formData.get("title") as string,
      destination: formData.get("destination") as string,
      excursion_date: formData.get("excursion_date") as string,
      departure_time: (formData.get("departure_time") as string) || null,
      return_time: (formData.get("return_time") as string) || null,
      transport_method: (formData.get("transport_method") as string) || null,
      supervisor_ratio: (formData.get("supervisor_ratio") as string) || null,
      notes: (formData.get("notes") as string) || null,
    })
    .select("id")
    .single();

  if (error || !data) redirect(`/excursions?error=${encodeURIComponent(error?.message ?? "Failed to create")}`);
  redirect(`/excursions/${data.id}`);
}

export async function updateExcursion(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  const { error } = await supabase.from("excursions").update({
    title: formData.get("title") as string,
    destination: formData.get("destination") as string,
    excursion_date: formData.get("excursion_date") as string,
    departure_time: (formData.get("departure_time") as string) || null,
    return_time: (formData.get("return_time") as string) || null,
    transport_method: (formData.get("transport_method") as string) || null,
    supervisor_ratio: (formData.get("supervisor_ratio") as string) || null,
    notes: (formData.get("notes") as string) || null,
    linked_risk_assessment_id: (formData.get("linked_risk_assessment_id") as string) || null,
    linked_permission_slip_id: (formData.get("linked_permission_slip_id") as string) || null,
  }).eq("id", id);

  if (error) redirect(`/excursions/${id}?error=${encodeURIComponent(error.message)}`);
  redirect(`/excursions/${id}`);
}

export async function deleteExcursion(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  await supabase.from("excursions").delete().eq("id", id);
  redirect("/excursions");
}

export async function toggleAttendee(formData: FormData) {
  const supabase = await createClient();
  const excursionId = formData.get("excursion_id") as string;
  const childId = formData.get("child_id") as string;
  const attending = formData.get("attending") === "true";

  if (attending) {
    await supabase.from("excursion_attendees").delete()
      .eq("excursion_id", excursionId).eq("child_id", childId);
  } else {
    await supabase.from("excursion_attendees").insert({ excursion_id: excursionId, child_id: childId });
  }
  redirect(`/excursions/${excursionId}`);
}
