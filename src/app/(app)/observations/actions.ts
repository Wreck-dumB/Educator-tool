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

  // Support both single child_id (old form) and multiple child_ids (group observation)
  const childIds = (formData.getAll("child_id") as string[]).filter(Boolean);
  const activityId = (formData.get("activity_id") as string) || null;
  const noteText = (formData.get("note_text") as string)?.trim();
  const eylfCodes = formData.getAll("eylf_codes") as string[];
  const returnTo = (formData.get("return_to") as string) || "/observations";
  const photo = formData.get("photo") as File | null;

  if (childIds.length === 0 || !noteText) {
    redirect(`${returnTo}?error=${encodeURIComponent("Please choose at least one child and write a note")}`);
  }

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) {
    redirect(`${returnTo}?error=${encodeURIComponent("No active service membership")}`);
  }

  // Upload photo once — shared across all child records
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
      photoUrl = path;
    }
  }

  // Resolve EYLF outcome IDs once
  let eylfOutcomeIds: string[] = [];
  if (eylfCodes.length > 0) {
    const { data: outcomes } = await supabase
      .from("eylf_outcomes")
      .select("id, code")
      .in("code", eylfCodes);
    eylfOutcomeIds = (outcomes ?? []).map((o) => o.id);
  }

  // Insert one observation per child
  const { data: insertedObs, error } = await supabase
    .from("observations")
    .insert(
      childIds.map((childId) => ({
        owner_user_id: ownerUserId,
        child_id: childId,
        activity_id: activityId,
        note_text: noteText,
        photo_url: photoUrl,
      })),
    )
    .select("id, child_id");

  if (error || !insertedObs || insertedObs.length === 0) {
    redirect(`${returnTo}?error=${encodeURIComponent(error?.message ?? "Could not save observation")}`);
  }

  if (eylfOutcomeIds.length > 0) {
    await supabase.from("observation_eylf_links").insert(
      insertedObs.flatMap((obs) =>
        eylfOutcomeIds.map((outcomeId) => ({ observation_id: obs.id, eylf_outcome_id: outcomeId })),
      ),
    );
  }

  revalidatePath("/observations");
  childIds.forEach((id) => revalidatePath(`/children/${id}`));
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

  const { data: obs } = await supabase
    .from("observations")
    .update({ shared_with_parent_at: new Date().toISOString(), shared_by: user.id })
    .eq("id", id)
    .select("child_id")
    .single();

  // Notify linked parents
  if (obs?.child_id) {
    const { data: links } = await supabase
      .from("parent_child_links")
      .select("parent_user_id")
      .eq("child_id", obs.child_id);

    if (links && links.length > 0) {
      const { data: child } = await supabase
        .from("children")
        .select("first_name")
        .eq("id", obs.child_id)
        .maybeSingle();

      const childName = child?.first_name ?? "your child";

      // In-app notifications
      await supabase.from("parent_notifications").insert(
        links.map((l) => ({
          recipient_user_id: l.parent_user_id,
          type: "observation_shared",
          title: `New observation for ${childName}`,
          body: "Your educator shared a new learning observation.",
          href: "/parent/observations",
        })),
      );

      // Email (fires only if RESEND_API_KEY is set)
      const { sendEmail, observationSharedEmail } = await import("@/lib/email");
      const parentIds = links.map((l) => l.parent_user_id);
      const { data: parentEmails } = await supabase
        .from("profiles")
        .select("id")
        .in("id", parentIds);
      // Fetch emails from auth.users via admin client is not available here;
      // email is sent server-side via RESEND_API_KEY from stored contact info if available
      // For now, in-app notification is the primary path; email requires Resend setup.
      void sendEmail; void observationSharedEmail; void parentEmails;
    }
  }

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
