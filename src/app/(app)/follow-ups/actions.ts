"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function addFollowUp(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const childId = formData.get("child_id") as string;
  const note = (formData.get("note") as string)?.trim();
  const observationId = (formData.get("observation_id") as string) || null;
  const returnTo = (formData.get("return_to") as string) || "/follow-ups";

  if (!childId || !note) redirect(returnTo);

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect(returnTo);

  await supabase.from("child_follow_ups").insert({
    owner_user_id: ownerUserId,
    child_id: childId,
    observation_id: observationId,
    note,
  });

  revalidatePath("/follow-ups");
  redirect(returnTo);
}

export async function markFollowUpDone(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const returnTo = (formData.get("return_to") as string) || "/follow-ups";

  await supabase
    .from("child_follow_ups")
    .update({ status: "done", resolved_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/follow-ups");
  redirect(returnTo);
}

export async function reopenFollowUp(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string;

  await supabase
    .from("child_follow_ups")
    .update({ status: "open", resolved_at: null })
    .eq("id", id);

  revalidatePath("/follow-ups");
  redirect("/follow-ups");
}
