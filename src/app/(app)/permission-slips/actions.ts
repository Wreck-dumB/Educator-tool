"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import type { PermissionSlipType } from "@/lib/types/database.types";

export async function createPermissionSlip(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = (formData.get("title") as string)?.trim();
  const bodyText = (formData.get("body_text") as string)?.trim();
  const slipType = formData.get("slip_type") as PermissionSlipType;
  const childIds = formData.getAll("child_ids") as string[];
  const requiresHighStakesAck = slipType === "medication_authorisation";

  if (!title || !bodyText || childIds.length === 0) {
    redirect("/permission-slips?error=Title, body text, and at least one child are required");
  }

  const educatorUserId = await getMyServiceOwnerId();
  if (!educatorUserId) {
    redirect("/permission-slips?error=No active service membership");
  }

  const { data: slip, error: slipError } = await supabase
    .from("permission_slips")
    .insert({ educator_user_id: educatorUserId, created_by_user_id: user.id, slip_type: slipType, title, status: "sent" })
    .select("id")
    .single();

  if (slipError || !slip) {
    redirect(`/permission-slips?error=${encodeURIComponent(slipError?.message ?? "Could not create slip")}`);
  }

  const { error: versionError } = await supabase.from("permission_slip_versions").insert({
    slip_id: slip.id,
    version_number: 1,
    body_text: bodyText,
    requires_high_stakes_ack: requiresHighStakesAck,
  });

  if (versionError) {
    redirect(`/permission-slips?error=${encodeURIComponent(versionError.message)}`);
  }

  const { error: targetsError } = await supabase.from("permission_slip_targets").insert(
    childIds.map((childId) => ({ slip_id: slip.id, child_id: childId, sent_version_number: 1 })),
  );

  if (targetsError) {
    redirect(`/permission-slips?error=${encodeURIComponent(targetsError.message)}`);
  }

  revalidatePath("/permission-slips");
  redirect("/permission-slips");
}

export async function reviseAndResendSlip(formData: FormData) {
  const supabase = await createClient();
  const slipId = formData.get("slip_id") as string;
  const bodyText = (formData.get("body_text") as string)?.trim();
  const childIds = formData.getAll("child_ids") as string[];

  if (!bodyText || childIds.length === 0) {
    redirect("/permission-slips?error=Body text and at least one child are required");
  }

  const { data: slip } = await supabase.from("permission_slips").select("current_version, slip_type").eq("id", slipId).single();
  if (!slip) redirect("/permission-slips?error=Not authorized");

  const newVersionNumber = slip.current_version + 1;

  const { error: versionError } = await supabase.from("permission_slip_versions").insert({
    slip_id: slipId,
    version_number: newVersionNumber,
    body_text: bodyText,
    requires_high_stakes_ack: slip.slip_type === "medication_authorisation",
  });

  if (versionError) {
    redirect(`/permission-slips?error=${encodeURIComponent(versionError.message)}`);
  }

  await supabase.from("permission_slips").update({ current_version: newVersionNumber }).eq("id", slipId);

  for (const childId of childIds) {
    await supabase
      .from("permission_slip_targets")
      .upsert({ slip_id: slipId, child_id: childId, sent_version_number: newVersionNumber }, { onConflict: "slip_id,child_id" });
  }

  revalidatePath("/permission-slips");
  redirect("/permission-slips");
}

export async function closePermissionSlip(formData: FormData) {
  const supabase = await createClient();
  const slipId = formData.get("slip_id") as string;
  if (!slipId) redirect("/permission-slips");
  await supabase.from("permission_slips").update({ status: "closed" }).eq("id", slipId);
  revalidatePath("/permission-slips");
  redirect("/permission-slips?status=closed");
}

export async function reopenPermissionSlip(formData: FormData) {
  const supabase = await createClient();
  const slipId = formData.get("slip_id") as string;
  if (!slipId) redirect("/permission-slips");
  await supabase.from("permission_slips").update({ status: "sent" }).eq("id", slipId);
  revalidatePath("/permission-slips");
  redirect("/permission-slips");
}
