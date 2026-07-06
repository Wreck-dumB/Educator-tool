"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import type { PosterImageSource, PosterTheme } from "@/lib/types/database.types";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function uploadPosterImage(
  formData: FormData,
): Promise<{ path: string; previewUrl: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service membership" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo first" };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Photo is too large — keep it under 5 MB" };
  }
  const ext = ALLOWED_UPLOAD_TYPES[file.type];
  if (!ext) {
    return { error: "Use a JPEG, PNG, or WebP image" };
  }

  const path = `${ownerUserId}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("poster-images")
    .upload(path, file, { contentType: file.type });
  if (error) {
    return { error: error.message };
  }

  const { data: signed } = await supabase.storage.from("poster-images").createSignedUrl(path, 60 * 60);
  return { path, previewUrl: signed?.signedUrl ?? "" };
}

export interface PosterInput {
  title: string;
  subtitle: string | null;
  bodyText: string | null;
  footerText: string | null;
  theme: PosterTheme;
  imageSource: PosterImageSource | null;
  imagePath: string | null;
  imageUrl: string | null;
  imageCredit: string | null;
}

export async function savePoster(input: PosterInput): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service membership" };

  if (!input.title.trim()) {
    return { error: "The poster needs a headline" };
  }

  const { data, error } = await supabase
    .from("posters")
    .insert({
      owner_user_id: ownerUserId,
      title: input.title.trim(),
      subtitle: input.subtitle,
      body_text: input.bodyText,
      footer_text: input.footerText,
      theme: input.theme,
      image_source: input.imageSource,
      image_path: input.imageSource === "upload" ? input.imagePath : null,
      image_url: input.imageSource === "stock" ? input.imageUrl : null,
      image_credit: input.imageSource === "stock" ? input.imageCredit : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save poster" };
  }

  revalidatePath("/posters");
  return { id: data.id };
}

export async function deletePoster(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  // Remove the uploaded photo too, so orphaned images don't pile up in storage.
  const { data: poster } = await supabase.from("posters").select("image_path").eq("id", id).maybeSingle();
  if (poster?.image_path) {
    await supabase.storage.from("poster-images").remove([poster.image_path]);
  }

  await supabase.from("posters").delete().eq("id", id);
  revalidatePath("/posters");
}
