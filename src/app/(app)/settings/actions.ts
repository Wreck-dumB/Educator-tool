"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function uploadServiceLogo(
  formData: FormData
): Promise<{ logoPath: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: service } = await supabase
    .from("services")
    .select("id, director_user_id")
    .eq("director_user_id", user.id)
    .maybeSingle();
  if (!service) return { error: "Only the Director can update service branding" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image first" };
  if (file.size > MAX_BYTES) return { error: "Image must be under 2 MB" };
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return { error: "Use a JPEG, PNG, or WebP image" };

  const path = `${user.id}/logo.${ext}`;

  // Remove any existing logo files for this service before uploading
  const { data: existing } = await supabase.storage
    .from("service-logos")
    .list(user.id);
  if (existing && existing.length > 0) {
    await supabase.storage
      .from("service-logos")
      .remove(existing.map((f) => `${user.id}/${f.name}`));
  }

  const { error: uploadError } = await supabase.storage
    .from("service-logos")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) return { error: uploadError.message };

  const { error: updateError } = await supabase
    .from("services")
    .update({ logo_path: path })
    .eq("id", service.id);
  if (updateError) return { error: updateError.message };

  revalidatePath("/settings");
  revalidatePath("/signin");
  return { logoPath: path };
}

export async function removeServiceLogo(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: service } = await supabase
    .from("services")
    .select("id, logo_path, director_user_id")
    .eq("director_user_id", user.id)
    .maybeSingle();
  if (!service) return { error: "Only the Director can update service branding" };

  if (service.logo_path) {
    await supabase.storage.from("service-logos").remove([service.logo_path]);
  }

  await supabase
    .from("services")
    .update({ logo_path: null })
    .eq("id", service.id);

  revalidatePath("/settings");
  revalidatePath("/signin");
  return {};
}

export async function updateServiceName(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  if (!name) return { error: "Centre name cannot be empty" };
  if (name.length > 200) return { error: "Name is too long" };

  const { data: service } = await supabase
    .from("services")
    .select("id, director_user_id")
    .eq("director_user_id", user.id)
    .maybeSingle();
  if (!service) return { error: "Only the Director can update service settings" };

  const { error } = await supabase
    .from("services")
    .update({ display_name: name })
    .eq("id", service.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/signin");
  return {};
}

const ALL_OBS_TYPES = [
  "anecdotal",
  "learning_story",
  "running_record",
  "jotting",
  "work_sample",
  "photo_caption",
  "developmental_note",
] as const;

export async function updateObservationPreferences(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: service } = await supabase
    .from("services")
    .select("id, director_user_id")
    .eq("director_user_id", user.id)
    .maybeSingle();
  if (!service) return { error: "Only the Director can update observation preferences" };

  const selected = ALL_OBS_TYPES.filter((t) => formData.get(t) === "1");
  if (selected.length === 0) return { error: "At least one observation type must be enabled" };

  const { error } = await supabase
    .from("services")
    .update({ preferred_observation_types: selected })
    .eq("id", service.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function updateGovernanceDetails(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: service } = await supabase
    .from("services")
    .select("id, director_user_id")
    .eq("director_user_id", user.id)
    .maybeSingle();
  if (!service) return { error: "Only the Director can update governance details" };

  const field = (name: string) => (formData.get(name) as string | null)?.trim() || null;

  const { error } = await supabase
    .from("services")
    .update({
      approved_provider_number: field("approved_provider_number"),
      service_approval_number: field("service_approval_number"),
      nominated_supervisor_name: field("nominated_supervisor_name"),
      nominated_supervisor_phone: field("nominated_supervisor_phone"),
      nominated_supervisor_email: field("nominated_supervisor_email"),
    })
    .eq("id", service.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function updateMaterialAlertLeadDays(days: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: service } = await supabase
    .from("services")
    .select("id, director_user_id")
    .eq("director_user_id", user.id)
    .maybeSingle();
  if (!service) return { error: "Only the Director can update this setting" };

  const clamped = Math.max(3, Math.min(90, Math.round(days)));
  const { error } = await supabase
    .from("services")
    .update({ material_alert_lead_days: clamped })
    .eq("id", service.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function acceptAiDataNotice(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: service } = await supabase
    .from("services")
    .select("id, director_user_id")
    .eq("director_user_id", user.id)
    .maybeSingle();
  if (!service) return { error: "Only the Director can acknowledge the AI data notice" };

  const { error } = await supabase
    .from("services")
    .update({
      ai_data_notice_accepted_at: new Date().toISOString(),
      ai_data_notice_accepted_by: user.id,
    })
    .eq("id", service.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}
