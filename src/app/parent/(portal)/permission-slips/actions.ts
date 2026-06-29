"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signPermissionSlip(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const slipId = formData.get("slip_id") as string;
  const childId = formData.get("child_id") as string;
  const versionId = formData.get("version_id") as string;
  const typedName = (formData.get("signer_typed_name") as string)?.trim();
  const affirmed = formData.get("affirmed") === "on";

  if (!typedName || !affirmed) {
    redirect("/parent/permission-slips?error=Type your full name and confirm the affirmation to sign");
  }

  // RLS re-checks linkage and that version_id matches what was actually
  // sent to this child at the moment of signing -- never trusts the form's
  // own correctness.
  const { error } = await supabase.from("permission_slip_signatures").insert({
    slip_id: slipId,
    child_id: childId,
    version_id: versionId,
    signed_by: user.id,
    signer_typed_name: typedName,
    affirmed,
  });

  if (error) {
    redirect(`/parent/permission-slips?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/parent/permission-slips");
  redirect("/parent/permission-slips");
}
