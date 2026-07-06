import { createClient } from "@/lib/supabase/server";
import type { Poster } from "@/lib/types/domain";

export async function getPosters(): Promise<Poster[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("posters").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function getPoster(id: string): Promise<Poster | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("posters").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

/**
 * Signed URL for an uploaded poster photo. The poster-images bucket is
 * private (uploads may include children's photos), so every render mints a
 * short-lived URL instead of exposing a permanent public one.
 */
export async function getPosterImageUrl(imagePath: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("poster-images").createSignedUrl(imagePath, 60 * 60);
  return data?.signedUrl ?? null;
}
