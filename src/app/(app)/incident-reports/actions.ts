"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getMyStaffRole } from "@/lib/supabase/staff";
import type { IncidentRecordType } from "@/lib/types/database.types";

function field(formData: FormData, name: string): string | null {
  return (formData.get(name) as string)?.trim() || null;
}

export async function createChildIncidentReport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const childId = formData.get("child_id") as string;
  const occurredAt = formData.get("occurred_at") as string;
  const description = field(formData, "description");
  const completedByName = field(formData, "completed_by_name");

  if (!childId || !occurredAt || !description || !completedByName) {
    redirect("/incident-reports?error=Child, date/time, description, and completed-by name are required");
  }

  const parentNotifiedAt = formData.get("parent_notified_at") as string;

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) {
    redirect("/incident-reports?error=No active service membership");
  }

  // Verify child belongs to this service before inserting
  const { data: childCheck } = await supabase
    .from("children")
    .select("id")
    .eq("id", childId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  if (!childCheck) {
    redirect("/incident-reports?error=Child not found in this service");
  }

  const { error } = await supabase.from("child_incident_reports").insert({
    owner_user_id: ownerUserId,
    created_by_user_id: user.id,
    child_id: childId,
    record_type: formData.get("record_type") as IncidentRecordType,
    occurred_at: new Date(occurredAt).toISOString(),
    location: field(formData, "location"),
    description,
    action_taken: field(formData, "action_taken"),
    parent_notified_at: parentNotifiedAt ? new Date(parentNotifiedAt).toISOString() : null,
    parent_notification_method: field(formData, "parent_notification_method"),
    nominated_supervisor_notified: formData.get("nominated_supervisor_notified") === "on",
    monitoring_plan: field(formData, "monitoring_plan"),
    witness_name: field(formData, "witness_name"),
    completed_by_name: completedByName,
    completed_by_role: field(formData, "completed_by_role"),
  });

  if (error) {
    redirect(`/incident-reports?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/incident-reports");
  redirect("/incident-reports");
}

export async function deleteChildIncidentReport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const myRole = await getMyStaffRole();
  if (myRole !== "director") {
    redirect("/incident-reports?error=Only the Director can delete incident records");
  }

  const id = formData.get("id") as string;
  const { error } = await supabase.from("child_incident_reports").delete().eq("id", id);
  if (error) redirect(`/incident-reports?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/incident-reports");
}

export async function createStaffIncidentReport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const staffName = field(formData, "staff_name");
  const occurredAt = formData.get("occurred_at") as string;
  const description = field(formData, "description");
  const completedByName = field(formData, "completed_by_name");

  if (!staffName || !occurredAt || !description || !completedByName) {
    redirect("/incident-reports?error=Staff name, date/time, description, and completed-by name are required");
  }

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) {
    redirect("/incident-reports?error=No active service membership");
  }

  const { error } = await supabase.from("staff_incident_reports").insert({
    owner_user_id: ownerUserId,
    created_by_user_id: user.id,
    staff_name: staffName,
    staff_role: field(formData, "staff_role"),
    occurred_at: new Date(occurredAt).toISOString(),
    location: field(formData, "location"),
    description,
    injury_description: field(formData, "injury_description"),
    first_aid_provided: formData.get("first_aid_provided") === "on",
    medical_treatment_sought: formData.get("medical_treatment_sought") === "on",
    is_potentially_notifiable: formData.get("is_potentially_notifiable") === "on",
    witness_name: field(formData, "witness_name"),
    immediate_actions: field(formData, "immediate_actions"),
    corrective_actions: field(formData, "corrective_actions"),
    completed_by_name: completedByName,
    completed_by_role: field(formData, "completed_by_role"),
  });

  if (error) {
    redirect(`/incident-reports?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/incident-reports");
  redirect("/incident-reports");
}

export async function deleteStaffIncidentReport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const myRole = await getMyStaffRole();
  if (myRole !== "director") {
    redirect("/incident-reports?error=Only the Director can delete incident records");
  }

  const id = formData.get("id") as string;
  const { error } = await supabase.from("staff_incident_reports").delete().eq("id", id);
  if (error) redirect(`/incident-reports?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/incident-reports");
}
