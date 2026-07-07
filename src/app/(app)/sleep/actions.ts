"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function addSleepRecord(formData: FormData) {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  const childId = formData.get("child_id") as string;
  const date = formData.get("date") as string;
  const sleepStart = formData.get("sleep_start") as string;
  const sleepEnd = (formData.get("sleep_end") as string).trim() || null;
  const notes = (formData.get("notes") as string).trim() || null;

  await supabase.from("daily_sleep").insert({
    owner_user_id: ownerUserId,
    child_id: childId,
    date,
    sleep_start: sleepStart,
    sleep_end: sleepEnd,
    notes,
  });

  revalidatePath(`/sleep?date=${date}`);
}

export async function updateSleepEnd(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const date = formData.get("date") as string;
  const sleepEnd = (formData.get("sleep_end") as string).trim() || null;

  await supabase.from("daily_sleep").update({ sleep_end: sleepEnd }).eq("id", id);

  revalidatePath(`/sleep?date=${date}`);
}

export async function deleteSleepRecord(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const date = formData.get("date") as string;

  await supabase.from("daily_sleep").delete().eq("id", id);

  revalidatePath(`/sleep?date=${date}`);
}
