"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function logObservation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const childId = formData.get("child_id") as string;
  const activityId = (formData.get("activity_id") as string) || null;
  const noteText = (formData.get("note_text") as string)?.trim();
  const eylfCodes = formData.getAll("eylf_codes") as string[];
  const returnTo = (formData.get("return_to") as string) || "/observations";
  const photo = formData.get("photo") as File | null;

  if (!childId || !noteText) {
    redirect(`${returnTo}?error=${encodeURIComponent("Please choose a child and write a note")}`);
  }

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) {
    redirect(`${returnTo}?error=${encodeURIComponent("No active service membership")}`);
  }

  // Upload photo first if provided
  let photoUrl: string | null = null;
  let photoFailed = false;
  if (photo && photo.size > 0) {
    const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    const path = `${ownerUserId}/${Date.now()}.${ext}`;
    const arrayBuffer = await photo.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("observation-photos")
      .upload(path, arrayBuffer, { contentType: photo.type, upsert: false });

    if (uploadError) {
      console.error("Observation photo upload failed:", uploadError);
      photoFailed = true;
    } else {
      // Bucket is private — store path and generate signed URLs at render time
      photoUrl = path;
    }
  }

  const { data: observation, error } = await supabase
    .from("observations")
    .insert({
      owner_user_id: ownerUserId,
      child_id: childId,
      activity_id: activityId,
      note_text: noteText,
      photo_url: photoUrl,
    })
    .select("id")
    .single();

  if (error || !observation) {
    redirect(`${returnTo}?error=${encodeURIComponent(error?.message ?? "Could not save observation")}`);
  }

  if (eylfCodes.length > 0) {
    const { data: outcomes } = await supabase
      .from("eylf_outcomes")
      .select("id, code")
      .in("code", eylfCodes);

    if (outcomes && outcomes.length > 0) {
      await supabase.from("observation_eylf_links").insert(
        outcomes.map((o) => ({ observation_id: observation.id, eylf_outcome_id: o.id })),
      );
    }
  }

  revalidatePath("/observations");
  revalidatePath(`/children/${childId}`);
  if (activityId) revalidatePath(`/activities/${activityId}`);
  if (photoFailed) {
    redirect(`${returnTo}?error=${encodeURIComponent("Observation saved, but photo upload failed — try adding the photo again from the observations list")}`);
  }
  redirect(returnTo);
}

export async function shareObservation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  if (!id) redirect("/observations");

  await supabase
    .from("observations")
    .update({ shared_with_parent_at: new Date().toISOString(), shared_by: user.id })
    .eq("id", id);

  revalidatePath("/observations");
  redirect("/observations");
}

export async function unshareObservation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  if (!id) redirect("/observations");

  await supabase
    .from("observations")
    .update({ shared_with_parent_at: null, shared_by: null })
    .eq("id", id);

  revalidatePath("/observations");
  redirect("/observations");
}
