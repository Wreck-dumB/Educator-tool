"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import type { SessionPreference, WaitingListStatus } from "@/lib/types/database.types";

export async function addEnquiry(formData: FormData) {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/dashboard");

  const { error } = await supabase.from("waiting_list_enquiries").insert({
    owner_user_id: ownerUserId,
    child_first_name: (formData.get("child_first_name") as string).trim(),
    child_date_of_birth: (formData.get("child_date_of_birth") as string) || null,
    preferred_start_date: (formData.get("preferred_start_date") as string) || null,
    room_id: (formData.get("room_id") as string) || null,
    session_preference: ((formData.get("session_preference") as string) || "flexible") as SessionPreference,
    parent_name: (formData.get("parent_name") as string).trim(),
    parent_email: (formData.get("parent_email") as string)?.trim() || null,
    parent_phone: (formData.get("parent_phone") as string)?.trim() || null,
    notes: (formData.get("notes") as string)?.trim() || null,
    enquiry_date: (formData.get("enquiry_date") as string) || undefined,
  });

  if (error) redirect(`/waiting-list?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/waiting-list");
  redirect("/waiting-list");
}

export async function updateEnquiryStatus(id: string, status: WaitingListStatus) {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  await supabase
    .from("waiting_list_enquiries")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_user_id", ownerUserId);

  revalidatePath("/waiting-list");
}

export async function deleteEnquiry(id: string) {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  await supabase
    .from("waiting_list_enquiries")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", ownerUserId);

  revalidatePath("/waiting-list");
}
