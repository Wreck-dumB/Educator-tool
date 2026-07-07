"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function addNappyRecord(formData: FormData) {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  const childId = formData.get("child_id") as string;
  const date = formData.get("date") as string;
  const changedAt = formData.get("changed_at") as string;
  const nappyType = formData.get("nappy_type") as string;
  const notes = (formData.get("notes") as string).trim() || null;

  await supabase.from("daily_nappy").insert({
    owner_user_id: ownerUserId,
    child_id: childId,
    date,
    changed_at: changedAt,
    nappy_type: nappyType as "wet" | "dirty" | "both" | "dry" | "na",
    notes,
  });

  revalidatePath(`/nappy?date=${date}`);
}

export async function deleteNappyRecord(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const date = formData.get("date") as string;

  await supabase.from("daily_nappy").delete().eq("id", id);

  revalidatePath(`/nappy?date=${date}`);
}
