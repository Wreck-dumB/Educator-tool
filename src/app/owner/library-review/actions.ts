"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformOwner } from "@/lib/supabase/serviceAccess";

/**
 * Approve a shared-library submission — the final gate before it's visible
 * to every other service. Platform-owner only, re-verified here server-side
 * (never trust the page gate alone). Writes with the service-role client,
 * safe precisely because of the owner check above.
 */
export async function approveSubmission(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isPlatformOwner(user.email)) {
    throw new Error("Not authorised");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");

  const admin = createAdminClient();
  const { error } = await admin
    .from("shared_library_activities")
    .update({
      status: "approved",
      admin_reviewed_by: user.id,
      admin_reviewed_at: new Date().toISOString(),
      admin_rejection_reason: null,
    })
    .eq("id", id)
    .eq("status", "pending_admin_review");

  if (error) throw new Error(error.message);
  revalidatePath("/owner/library-review");
}

export async function rejectSubmission(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isPlatformOwner(user.email)) {
    throw new Error("Not authorised");
  }

  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) throw new Error("Missing id");

  const admin = createAdminClient();
  const { error } = await admin
    .from("shared_library_activities")
    .update({
      status: "rejected",
      admin_reviewed_by: user.id,
      admin_reviewed_at: new Date().toISOString(),
      admin_rejection_reason: reason || "Not approved for the community library.",
    })
    .eq("id", id)
    .eq("status", "pending_admin_review");

  if (error) throw new Error(error.message);
  revalidatePath("/owner/library-review");
}
