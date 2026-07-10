"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function saveSafetyCheck(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/safety-checks?error=No active service membership");

  const checkDate = formData.get("check_date") as string;
  const roomId = (formData.get("room_id") as string) || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  // Collect item keys from formData (all keys that start with "item_")
  const items: Record<string, boolean> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("item_")) {
      items[key.slice(5)] = value === "1";
    }
  }

  // NULL room_id breaks onConflict upsert (NULLs don't match in unique constraints),
  // so we check-then-insert-or-update manually.
  const existingQuery = supabase
    .from("environment_safety_checks")
    .select("id")
    .eq("owner_user_id", ownerUserId)
    .eq("check_date", checkDate);
  if (roomId) {
    existingQuery.eq("room_id", roomId);
  } else {
    existingQuery.is("room_id", null);
  }
  const { data: existing } = await existingQuery.maybeSingle();

  const payload = { items, notes, completed_by_user_id: user.id };
  let error: { message: string } | null = null;

  if (existing?.id) {
    const { error: updateErr } = await supabase
      .from("environment_safety_checks")
      .update(payload)
      .eq("id", existing.id);
    error = updateErr;
  } else {
    const { error: insertErr } = await supabase
      .from("environment_safety_checks")
      .insert({ owner_user_id: ownerUserId, check_date: checkDate, room_id: roomId, ...payload });
    error = insertErr;
  }

  if (error) redirect(`/safety-checks?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/safety-checks");
  redirect(`/safety-checks?date=${checkDate}`);
}
