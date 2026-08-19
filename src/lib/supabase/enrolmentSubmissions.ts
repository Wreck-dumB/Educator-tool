import { createClient } from "@/lib/supabase/server";
import { decryptField } from "@/lib/encryption";
import type {
  ChildEnrolmentSubmission,
  ChildEnrolmentDocument,
  ChildContactSubmission,
} from "@/lib/types/domain";

// additional_needs may be encrypted at rest — every read path must decrypt
// it before use, same convention as decryptChild() in lib/supabase/children.ts.
function decryptSubmission<T extends { additional_needs: string | null }>(submission: T): T {
  return { ...submission, additional_needs: decryptField(submission.additional_needs) };
}

// RLS already scopes visibility correctly for both callers (a parent sees
// only their own submitted_by/uploaded_by rows, staff see all in-service
// rows) — so these three helpers work unchanged for both the parent
// "my submissions" view and the staff review queue.

export async function getEnrolmentSubmissions(childId: string): Promise<ChildEnrolmentSubmission[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("child_enrolment_submissions")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(decryptSubmission);
}

export async function getEnrolmentDocuments(childId: string): Promise<ChildEnrolmentDocument[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("child_enrolment_documents")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getContactSubmissions(childId: string): Promise<ChildContactSubmission[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("child_contact_submissions")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Signed URL for a document in the private enrolment-documents bucket, valid 1 hour. */
export async function getSignedEnrolmentDocumentUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("enrolment-documents").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
