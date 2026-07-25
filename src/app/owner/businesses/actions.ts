"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformOwner, type AccessStatus } from "@/lib/supabase/serviceAccess";

const STATUSES: AccessStatus[] = ["trial", "active", "suspended", "expired"];

/**
 * Update a single service's access record. Platform-owner only — re-verified
 * here server-side; never trust the page gate alone. Writes with the service-role
 * client (bypasses RLS), which is safe precisely because of the owner check above.
 */
export async function updateServiceAccess(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isPlatformOwner(user.email)) {
    throw new Error("Not authorised");
  }

  const serviceId = String(formData.get("service_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const trialEndsRaw = String(formData.get("trial_ends_at") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();

  if (!serviceId) throw new Error("Missing service_id");
  if (!STATUSES.includes(status as AccessStatus)) throw new Error("Invalid status");

  const admin = createAdminClient();
  const { error } = await admin
    .from("service_access")
    .update({
      status: status as AccessStatus,
      trial_ends_at: trialEndsRaw ? new Date(trialEndsRaw).toISOString() : null,
      notes: notesRaw || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("service_id", serviceId);

  if (error) throw new Error(error.message);

  revalidatePath("/owner/businesses");
}
