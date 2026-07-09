"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import type { RoutineBlock } from "@/lib/types/database.types";

export async function saveRoutine(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/day-plan");

  const title = (formData.get("title") as string)?.trim() || "Day Plan";
  const date = (formData.get("date") as string) || null;
  const roomId = (formData.get("room_id") as string) || null;
  const focusTopic = (formData.get("focus_topic") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const isTemplate = formData.get("is_template") === "1";
  const blocksJson = (formData.get("blocks") as string) || "[]";
  const existingId = (formData.get("existing_id") as string) || null;

  let blocks: RoutineBlock[] = [];
  try {
    blocks = JSON.parse(blocksJson);
  } catch {
    blocks = [];
  }

  if (existingId) {
    await supabase
      .from("daily_routines")
      .update({ title, date, room_id: roomId, focus_topic: focusTopic, notes, is_template: isTemplate, blocks, updated_at: new Date().toISOString() })
      .eq("id", existingId);
  } else {
    await supabase.from("daily_routines").insert({
      owner_user_id: ownerUserId,
      title,
      date,
      room_id: roomId,
      focus_topic: focusTopic,
      notes,
      is_template: isTemplate,
      blocks,
    });
  }

  revalidatePath("/day-plan");
  if (date) revalidatePath(`/day-plan?date=${date}`);
  redirect(date ? `/day-plan?date=${date}&saved=1` : `/day-plan?saved=1`);
}

export async function addProgramEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/day-plan");

  const dayDate = formData.get("day_date") as string;
  const activityId = (formData.get("activity_id") as string) || null;
  const title = (formData.get("title") as string)?.trim();
  const eylfCodesJson = (formData.get("eylf_codes") as string) || "[]";
  const eylfCodes = JSON.parse(eylfCodesJson) as string[];
  const notes = (formData.get("notes") as string)?.trim() || null;

  // Find a program that covers this date
  const { data: programs } = await supabase
    .from("programs")
    .select("id")
    .eq("owner_user_id", ownerUserId)
    .lte("start_date", dayDate)
    .gte("end_date", dayDate)
    .limit(1);

  if (!programs || programs.length === 0) {
    redirect(`/day-plan?date=${dayDate}&error=${encodeURIComponent("No program covers this date — create one first under Programs")}`);
  }

  await supabase.from("program_entries").insert({
    program_id: programs[0].id,
    activity_id: activityId,
    day_date: dayDate,
    title: title || "Untitled activity",
    eylf_codes: eylfCodes,
    notes,
  });

  revalidatePath("/day-plan");
  revalidatePath(`/programs/${programs[0].id}`);
  redirect(`/day-plan?date=${dayDate}&added=1`);
}
