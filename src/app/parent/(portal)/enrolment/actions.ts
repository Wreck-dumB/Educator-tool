"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encryptField } from "@/lib/encryption";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

const DOCUMENT_TYPES = [
  "immunisation_statement",
  "medical_management_plan",
  "court_order",
  "enrolment_form",
  "other",
] as const;
type DocumentType = (typeof DOCUMENT_TYPES)[number];

// A parent never supplies educator_user_id directly — it's re-derived here
// from parent_child_links, scoped to both this parent and this child, so a
// forged child_id or educator_user_id in the form simply resolves to
// nothing rather than letting a proposal land against the wrong service.
async function resolveLinkedChild(childId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: link } = await supabase
    .from("parent_child_links")
    .select("educator_user_id")
    .eq("child_id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  return { supabase, user, educatorUserId: link?.educator_user_id ?? null };
}

function field(formData: FormData, name: string): string | null {
  return (formData.get(name) as string)?.trim() || null;
}

export async function submitEnrolmentUpdate(formData: FormData) {
  const childId = formData.get("child_id") as string;
  const { supabase, user, educatorUserId } = await resolveLinkedChild(childId);
  if (!educatorUserId) redirect("/parent/enrolment?error=Not linked to this child");

  const additionalNeeds = field(formData, "additional_needs");

  const { error } = await supabase.from("child_enrolment_submissions").insert({
    child_id: childId,
    educator_user_id: educatorUserId,
    submitted_by: user!.id,
    first_name: field(formData, "first_name"),
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
  });

  if (error) redirect(`/parent/enrolment?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/parent/enrolment");
  redirect("/parent/enrolment?message=Update submitted for review");
}

export async function deleteOwnPendingEnrolmentSubmission(formData: FormData) {
  const supabase = await createClient();
  const submissionId = formData.get("submission_id") as string;
  if (!submissionId) redirect("/parent/enrolment");
  await supabase.from("child_enrolment_submissions").delete().eq("id", submissionId);
  revalidatePath("/parent/enrolment");
  redirect("/parent/enrolment");
}

export async function uploadEnrolmentDocument(formData: FormData) {
  const childId = formData.get("child_id") as string;
  const documentTypeRaw = formData.get("document_type") as string;
  if (!DOCUMENT_TYPES.includes(documentTypeRaw as DocumentType)) {
    redirect("/parent/enrolment?error=Choose a valid document type");
  }
  const documentType = documentTypeRaw as DocumentType;
  const { supabase, user, educatorUserId } = await resolveLinkedChild(childId);
  if (!educatorUserId) redirect("/parent/enrolment?error=Not linked to this child");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/parent/enrolment?error=Choose a file first");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    redirect("/parent/enrolment?error=File is too large — keep it under 5 MB");
  }
  const ext = ALLOWED_UPLOAD_TYPES[file.type];
  if (!ext) {
    redirect("/parent/enrolment?error=Use a PDF, JPEG, PNG, WebP, or HEIC file");
  }

  const path = `${childId}/${randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("enrolment-documents")
    .upload(path, file, { contentType: file.type });
  if (uploadError) redirect(`/parent/enrolment?error=${encodeURIComponent(uploadError.message)}`);

  const { error } = await supabase.from("child_enrolment_documents").insert({
    child_id: childId,
    educator_user_id: educatorUserId,
    uploaded_by: user!.id,
    document_type: documentType,
    storage_path: path,
    original_filename: file.name,
    file_size: file.size,
    mime_type: file.type,
    notes: field(formData, "notes"),
  });

  if (error) {
    await supabase.storage.from("enrolment-documents").remove([path]);
    redirect(`/parent/enrolment?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/parent/enrolment");
  redirect("/parent/enrolment?message=Document uploaded for review");
}

export async function deleteOwnPendingEnrolmentDocument(formData: FormData) {
  const supabase = await createClient();
  const documentId = formData.get("document_id") as string;
  if (!documentId) redirect("/parent/enrolment");

  const { data: doc } = await supabase
    .from("child_enrolment_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (doc?.storage_path) {
    await supabase.storage.from("enrolment-documents").remove([doc.storage_path]);
  }
  await supabase.from("child_enrolment_documents").delete().eq("id", documentId);

  revalidatePath("/parent/enrolment");
  redirect("/parent/enrolment");
}

export async function submitChildContactChange(formData: FormData) {
  const childId = formData.get("child_id") as string;
  const { supabase, user, educatorUserId } = await resolveLinkedChild(childId);
  if (!educatorUserId) redirect("/parent/enrolment?error=Not linked to this child");

  const action = formData.get("action") as "add" | "update" | "remove";
  const existingContactId = (formData.get("existing_contact_id") as string) || null;

  const { error } = await supabase.from("child_contact_submissions").insert({
    child_id: childId,
    educator_user_id: educatorUserId,
    submitted_by: user!.id,
    action,
    existing_contact_id: existingContactId,
    full_name: field(formData, "full_name"),
    relationship: field(formData, "relationship"),
    phone: field(formData, "phone"),
    email: field(formData, "email"),
    is_parent_guardian: formData.get("is_parent_guardian") === "on",
    is_emergency_contact: formData.get("is_emergency_contact") === "on",
    is_authorised_nominee: formData.get("is_authorised_nominee") === "on",
    can_consent_medical_treatment: formData.get("can_consent_medical_treatment") === "on",
    can_authorise_medication: formData.get("can_authorise_medication") === "on",
    can_authorise_excursions: formData.get("can_authorise_excursions") === "on",
    notes: field(formData, "notes"),
  });

  if (error) redirect(`/parent/enrolment?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/parent/enrolment");
  redirect("/parent/enrolment?message=Contact change submitted for review");
}

export async function deleteOwnPendingContactSubmission(formData: FormData) {
  const supabase = await createClient();
  const submissionId = formData.get("submission_id") as string;
  if (!submissionId) redirect("/parent/enrolment");
  await supabase.from("child_contact_submissions").delete().eq("id", submissionId);
  revalidatePath("/parent/enrolment");
  redirect("/parent/enrolment");
}
