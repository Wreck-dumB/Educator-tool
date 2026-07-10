"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function createComplaintRecord(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/complaints?error=No active service membership");

  const subject = (formData.get("subject") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  if (!subject || !description) {
    redirect("/complaints?error=Subject and description are required");
  }

  const receivedAt = formData.get("received_at") as string;

  const { error } = await supabase.from("complaint_records").insert({
    owner_user_id: ownerUserId,
    received_at: receivedAt ? new Date(receivedAt).toISOString() : new Date().toISOString(),
    complainant_type: ((formData.get("complainant_type") as string) || "parent") as "parent" | "staff" | "child" | "community" | "anonymous" | "regulatory_body",
    subject,
    description,
    status: "received",
    created_by_user_id: user.id,
  });

  if (error) redirect(`/complaints?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/complaints");
  redirect("/complaints");
}

export async function updateComplaintStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  const resolutionNotes = (formData.get("resolution_notes") as string)?.trim() || null;
  const resolved = status === "resolved";

  const { error } = await supabase
    .from("complaint_records")
    .update({
      status: status as "received" | "acknowledged" | "under_review" | "resolved" | "escalated",
      resolution_notes: resolutionNotes,
      resolved_at: resolved ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) redirect(`/complaints?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/complaints");
  redirect("/complaints");
}

export async function deleteComplaintRecord(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  await supabase.from("complaint_records").delete().eq("id", id);
  revalidatePath("/complaints");
  redirect("/complaints");
}
