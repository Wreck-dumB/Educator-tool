"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createChild(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const firstName = (formData.get("first_name") as string)?.trim();
  const dateOfBirth = (formData.get("date_of_birth") as string) || null;
  const currentInterests = (formData.get("current_interests") as string)?.trim() || null;
  const additionalNeeds = (formData.get("additional_needs") as string)?.trim() || null;

  if (!firstName) {
    redirect("/children?error=Please enter a first name");
  }

  const { error } = await supabase.from("children").insert({
    owner_user_id: user.id,
    first_name: firstName,
    date_of_birth: dateOfBirth,
    current_interests: currentInterests,
    additional_needs: additionalNeeds,
  });

  if (error) {
    redirect(`/children?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/children");
  redirect("/children");
}

export async function updateChild(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const firstName = (formData.get("first_name") as string)?.trim();
  const dateOfBirth = (formData.get("date_of_birth") as string) || null;
  const currentInterests = (formData.get("current_interests") as string)?.trim() || null;
  const additionalNeeds = (formData.get("additional_needs") as string)?.trim() || null;

  if (!firstName) {
    redirect(`/children/${id}?error=Please enter a first name`);
  }

  const { error } = await supabase
    .from("children")
    .update({
      first_name: firstName,
      date_of_birth: dateOfBirth,
      current_interests: currentInterests,
      additional_needs: additionalNeeds,
    })
    .eq("id", id);

  if (error) {
    redirect(`/children/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/children");
  revalidatePath(`/children/${id}`);
  redirect(`/children/${id}`);
}

export async function deleteChild(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  await supabase.from("children").delete().eq("id", id);

  revalidatePath("/children");
  redirect("/children");
}

export async function createChildInvite(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const childId = formData.get("child_id") as string;
  const invitedEmail = (formData.get("invited_email") as string)?.trim();

  if (!invitedEmail) {
    redirect(`/children/${childId}?error=Please enter the family's email`);
  }

  // RLS re-checks ownership of childId server-side -- a forged child_id for
  // someone else's child simply fails to insert (zero rows affected), not
  // a leak. educator_user_id is set to the caller, never trusted from input.
  const { error } = await supabase.from("child_invites").insert({
    child_id: childId,
    educator_user_id: user.id,
    invited_email: invitedEmail,
  });

  if (error) {
    redirect(`/children/${childId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/children/${childId}`);
  redirect(`/children/${childId}`);
}

export async function revokeChildInvite(formData: FormData) {
  const supabase = await createClient();
  const inviteId = formData.get("invite_id") as string;
  const childId = formData.get("child_id") as string;

  await supabase.from("child_invites").update({ status: "revoked" }).eq("id", inviteId);

  revalidatePath(`/children/${childId}`);
  redirect(`/children/${childId}`);
}
