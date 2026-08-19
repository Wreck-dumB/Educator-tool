"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { encryptField } from "@/lib/encryption";

// RLS already restricts these UPDATEs to 2IC+ (see 0066's "2IC+ can review
// ..." policies), but an app-level check runs first so a non-2IC gets a
// clear redirect instead of a silent no-op Postgres update (0 rows
// affected) — belt-and-braces, not a substitute for the RLS layer.
async function requireReviewer(childId: string) {
  const role = await getMyStaffRole();
  if (role !== "director" && role !== "2ic") {
    redirect(`/children/${childId}/enrolment-review?error=Only a director or 2IC can review enrolment submissions`);
  }
}

function field(formData: FormData, name: string): string | null {
  return (formData.get(name) as string)?.trim() || null;
}

async function notifyParent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recipientUserId: string,
  title: string,
  body: string,
) {
  await supabase.from("parent_notifications").insert({
    recipient_user_id: recipientUserId,
    type: "enrolment_update_reviewed",
    title,
    body,
    href: null,
  });
}

export async function approveEnrolmentSubmission(formData: FormData) {
  const childId = formData.get("child_id") as string;
  const submissionId = formData.get("submission_id") as string;
  await requireReviewer(childId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: submission } = await supabase
    .from("child_enrolment_submissions")
    .select("submitted_by")
    .eq("id", submissionId)
    .maybeSingle();
  if (!submission) redirect(`/children/${childId}/enrolment-review`);

  const additionalNeeds = field(formData, "additional_needs");

  const { error } = await supabase
    .from("children")
    .update({
      first_name: field(formData, "first_name") ?? undefined,
      date_of_birth: field(formData, "date_of_birth"),
      current_interests: field(formData, "current_interests"),
      additional_needs: additionalNeeds ? encryptField(additionalNeeds) : null,
      address: field(formData, "address"),
      medical_practice_name: field(formData, "medical_practice_name"),
      medical_practice_phone: field(formData, "medical_practice_phone"),
      medicare_number: field(formData, "medicare_number"),
      medical_conditions: field(formData, "medical_conditions"),
      is_anaphylaxis_risk: formData.get("is_anaphylaxis_risk") === "on",
      medical_management_plan: field(formData, "medical_management_plan"),
      dietary_restrictions: field(formData, "dietary_restrictions"),
    })
    .eq("id", childId);
  if (error) redirect(`/children/${childId}/enrolment-review?error=${encodeURIComponent(error.message)}`);

  await supabase
    .from("child_enrolment_submissions")
    .update({ status: "approved", moderated_by: user.id, moderated_at: new Date().toISOString() })
    .eq("id", submissionId);

  await notifyParent(
    supabase,
    submission.submitted_by,
    "Enrolment update approved",
    "Your submitted enrolment update has been applied to your child's file.",
  );

  revalidatePath(`/children/${childId}`);
  revalidatePath(`/children/${childId}/enrolment-review`);
  redirect(`/children/${childId}/enrolment-review`);
}

export async function rejectEnrolmentSubmission(formData: FormData) {
  const childId = formData.get("child_id") as string;
  const submissionId = formData.get("submission_id") as string;
  await requireReviewer(childId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reason = field(formData, "reason");

  const { data: submission } = await supabase
    .from("child_enrolment_submissions")
    .update({ status: "rejected", moderated_by: user.id, moderated_at: new Date().toISOString(), rejection_reason: reason })
    .eq("id", submissionId)
    .select("submitted_by")
    .maybeSingle();

  if (submission) {
    await notifyParent(
      supabase,
      submission.submitted_by,
      "Enrolment update not approved",
      reason ?? "Your submitted enrolment update was not approved. Contact the service for details.",
    );
  }

  revalidatePath(`/children/${childId}/enrolment-review`);
  redirect(`/children/${childId}/enrolment-review`);
}

export async function approveEnrolmentDocument(formData: FormData) {
  const childId = formData.get("child_id") as string;
  const documentId = formData.get("document_id") as string;
  await requireReviewer(childId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: doc } = await supabase
    .from("child_enrolment_documents")
    .update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", documentId)
    .select("uploaded_by, document_type")
    .maybeSingle();

  if (doc) {
    await notifyParent(
      supabase,
      doc.uploaded_by,
      "Document approved",
      "A document you uploaded has been reviewed and filed.",
    );
  }

  revalidatePath(`/children/${childId}/enrolment-review`);
  redirect(`/children/${childId}/enrolment-review`);
}

export async function rejectEnrolmentDocument(formData: FormData) {
  const childId = formData.get("child_id") as string;
  const documentId = formData.get("document_id") as string;
  await requireReviewer(childId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reason = field(formData, "reason");

  const { data: doc } = await supabase
    .from("child_enrolment_documents")
    .update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString(), rejection_reason: reason })
    .eq("id", documentId)
    .select("uploaded_by")
    .maybeSingle();

  if (doc) {
    await notifyParent(
      supabase,
      doc.uploaded_by,
      "Document not approved",
      reason ?? "A document you uploaded was not approved. Contact the service for details.",
    );
  }

  revalidatePath(`/children/${childId}/enrolment-review`);
  redirect(`/children/${childId}/enrolment-review`);
}

export async function approveContactSubmission(formData: FormData) {
  const childId = formData.get("child_id") as string;
  const submissionId = formData.get("submission_id") as string;
  await requireReviewer(childId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: submission } = await supabase
    .from("child_contact_submissions")
    .select("*")
    .eq("id", submissionId)
    .maybeSingle();
  if (!submission) redirect(`/children/${childId}/enrolment-review`);

  const { data: child } = await supabase.from("children").select("owner_user_id").eq("id", childId).maybeSingle();
  if (!child) redirect(`/children/${childId}/enrolment-review`);

  // The check constraint on child_contact_submissions guarantees full_name
  // is set whenever action is 'add' or 'update' (only 'remove' allows it null).
  if (submission.action === "add") {
    await supabase.from("child_contacts").insert({
      child_id: childId,
      owner_user_id: child.owner_user_id,
      full_name: submission.full_name!,
      relationship: submission.relationship,
      phone: submission.phone,
      email: submission.email,
      is_parent_guardian: submission.is_parent_guardian,
      is_emergency_contact: submission.is_emergency_contact,
      is_authorised_nominee: submission.is_authorised_nominee,
      can_consent_medical_treatment: submission.can_consent_medical_treatment,
      can_authorise_medication: submission.can_authorise_medication,
      can_authorise_excursions: submission.can_authorise_excursions,
      notes: submission.notes,
    });
  } else if (submission.action === "update" && submission.existing_contact_id) {
    await supabase
      .from("child_contacts")
      .update({
        full_name: submission.full_name!,
        relationship: submission.relationship,
        phone: submission.phone,
        email: submission.email,
        is_parent_guardian: submission.is_parent_guardian,
        is_emergency_contact: submission.is_emergency_contact,
        is_authorised_nominee: submission.is_authorised_nominee,
        can_consent_medical_treatment: submission.can_consent_medical_treatment,
        can_authorise_medication: submission.can_authorise_medication,
        can_authorise_excursions: submission.can_authorise_excursions,
        notes: submission.notes,
      })
      .eq("id", submission.existing_contact_id);
  } else if (submission.action === "remove" && submission.existing_contact_id) {
    await supabase.from("child_contacts").delete().eq("id", submission.existing_contact_id);
  }

  await supabase
    .from("child_contact_submissions")
    .update({ status: "approved", moderated_by: user.id, moderated_at: new Date().toISOString() })
    .eq("id", submissionId);

  await notifyParent(
    supabase,
    submission.submitted_by,
    "Contact change approved",
    "Your submitted contact change has been applied.",
  );

  revalidatePath(`/children/${childId}`);
  revalidatePath(`/children/${childId}/enrolment-review`);
  redirect(`/children/${childId}/enrolment-review`);
}

export async function rejectContactSubmission(formData: FormData) {
  const childId = formData.get("child_id") as string;
  const submissionId = formData.get("submission_id") as string;
  await requireReviewer(childId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reason = field(formData, "reason");

  const { data: submission } = await supabase
    .from("child_contact_submissions")
    .update({ status: "rejected", moderated_by: user.id, moderated_at: new Date().toISOString(), rejection_reason: reason })
    .eq("id", submissionId)
    .select("submitted_by")
    .maybeSingle();

  if (submission) {
    await notifyParent(
      supabase,
      submission.submitted_by,
      "Contact change not approved",
      reason ?? "Your submitted contact change was not approved. Contact the service for details.",
    );
  }

  revalidatePath(`/children/${childId}/enrolment-review`);
  redirect(`/children/${childId}/enrolment-review`);
}
