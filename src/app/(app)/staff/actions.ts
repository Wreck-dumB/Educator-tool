"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StaffInviteRole, StaffRole, StaffMembershipStatus } from "@/lib/types/database.types";

export async function createStaffInvite(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const serviceId = formData.get("service_id") as string;
  const invitedEmail = (formData.get("invited_email") as string)?.trim();
  const invitedRole = formData.get("invited_role") as StaffInviteRole;

  if (!invitedEmail) {
    redirect("/staff?error=Please enter an email");
  }

  // RLS's grant-ceiling check on staff_invites rejects a 2IC trying to
  // invite at 'director' role at the database level -- this isn't just a
  // UI restriction (the <select> below only offers valid options anyway).
  const { error } = await supabase.from("staff_invites").insert({
    service_id: serviceId,
    invited_email: invitedEmail,
    invited_role: invitedRole,
    invited_by: user.id,
  });

  if (error) {
    redirect(`/staff?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/staff");
  redirect("/staff");
}

export async function revokeStaffInvite(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  await supabase.from("staff_invites").update({ status: "revoked" }).eq("id", id);

  revalidatePath("/staff");
}

export async function updateStaffMemberRole(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const role = formData.get("role") as StaffRole;

  await supabase.from("staff_memberships").update({ role }).eq("id", id);

  revalidatePath("/staff");
}

export async function setStaffMemberStatus(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const status = formData.get("status") as StaffMembershipStatus;

  await supabase
    .from("staff_memberships")
    .update({ status, removed_at: status === "removed" ? new Date().toISOString() : null })
    .eq("id", id);

  revalidatePath("/staff");
}
