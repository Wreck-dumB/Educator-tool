"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  if (!childId || !noteText) {
    redirect(`${returnTo}?error=${encodeURIComponent("Please choose a child and write a note")}`);
  }

  const { data: observation, error } = await supabase
    .from("observations")
    .insert({
      owner_user_id: user.id,
      child_id: childId,
      activity_id: activityId,
      note_text: noteText,
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
  redirect(returnTo);
}
