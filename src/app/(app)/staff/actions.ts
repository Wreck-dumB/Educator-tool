"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StaffInviteRole, StaffRole, StaffMembershipStatus } from "@/lib/types/database.types";
import { sendEmail, staffInviteEmail } from "@/lib/email";

const ROLE_LABELS: Record<string, string> = {
  "2ic": "2IC (Assistant Director)",
  staff: "Staff",
};

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
  const { data: invite, error } = await supabase
    .from("staff_invites")
    .insert({
      service_id: serviceId,
      invited_email: invitedEmail,
      invited_role: invitedRole,
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (error) {
    redirect(`/staff?error=${encodeURIComponent(error.message)}`);
  }

  // Best-effort — the invite row is already created regardless of whether
  // the email goes out, so a director can still relay the accept link manually.
  try {
    const { data: service } = await supabase.from("services").select("name").eq("id", serviceId).maybeSingle();
    await sendEmail(
      staffInviteEmail(invitedEmail, service?.name ?? "your service", ROLE_LABELS[invitedRole] ?? invitedRole, invite.token)
    );
  } catch (err) {
    console.error("Staff invite email failed (invite itself still created):", err);
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
