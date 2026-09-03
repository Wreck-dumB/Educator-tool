"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getActivity } from "@/lib/supabase/activities";

// Clears the cooldown for this service then runs the alert function so director/2IC
// get an immediate in-app notification regardless of the 3-day dedup window.
export async function sendMaterialAlertNow(): Promise<{ notificationsCreated: number } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service" };

  // Clear dedup so the function doesn't skip due to the 3-day cooldown
  await supabase.from("material_order_alerts").delete().eq("owner_user_id", ownerUserId);

  // Run the alert function
  const { data, error } = await supabase.rpc("process_material_order_alerts");
  if (error) return { error: error.message };

  const count = (data as { notifications_created?: number })?.notifications_created ?? 0;
  revalidatePath("/dashboard");
  return { notificationsCreated: count };
}
import type { ProgramEntrySuggestion, ProgramBlock, ProgramStatus, ProgramEntry } from "@/lib/types/domain";
import type { CulturalDay } from "@/lib/types/database.types";

export async function addActivityToProgram(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/programs");

  const programId = formData.get("program_id") as string;
  const activityId = (formData.get("activity_id") as string) || null;
  const dayDate = formData.get("day_date") as string;
  const title = (formData.get("title") as string)?.trim();
  const eylfCodesJson = (formData.get("eylf_codes") as string) || "[]";
  const eylfCodes = JSON.parse(eylfCodesJson) as string[];

  if (!programId || !dayDate || !title) redirect("/programs");

  const { error } = await supabase.from("program_entries").insert({
    program_id: programId,
    activity_id: activityId,
    day_date: dayDate,
    title,
    eylf_codes: eylfCodes,
    notes: null,
  });

  if (error) {
    redirect(`/programs/${programId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/programs/${programId}`);
  redirect(`/programs/${programId}`);
}

export async function saveProgram(
  title: string,
  startDate: string,
  endDate: string,
  culturalDays: CulturalDay[],
  entries: ProgramEntrySuggestion[],
  roomId: string | null = null,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) {
    return { error: "No active service membership" };
  }

  const { data: program, error: programError } = await supabase
    .from("programs")
    .insert({
      owner_user_id: ownerUserId,
      title,
      start_date: startDate,
      end_date: endDate,
      cultural_days: culturalDays,
      room_id: roomId,
    })
    .select("id")
    .single();

  if (programError || !program) {
    return { error: programError?.message ?? "Could not save program" };
  }

  if (entries.length > 0) {
    const { error: entriesError } = await supabase.from("program_entries").insert(
      entries.map((e) => ({
        program_id: program.id,
        day_date: e.dayDate,
        title: e.title,
        notes: e.notes,
        activity_id: e.activityId,
        eylf_codes: e.eylfCodes,
        block_key: e.blockKey,
        order_index: e.orderIndex,
      })),
    );
    if (entriesError) {
      return { error: entriesError.message };
    }
  }

  revalidatePath("/programs");
  return { id: program.id };
}

async function requireOwnerForProgram(supabase: Awaited<ReturnType<typeof createClient>>, programId: string) {
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return null;
  const { data: program } = await supabase
    .from("programs")
    .select("id")
    .eq("id", programId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  return program ? ownerUserId : null;
}

// Fills a specific day/block cell that's empty — either never generated
// (deleted by the educator, or a block the AI skipped) or freshly cleared.
// Lets the educator either link a saved activity or just write freehand
// notes, since a routine segment doesn't always need a full activity (e.g.
// a flexible "choice time" or a simple note about how the day is running).
export async function addProgramEntry(
  programId: string,
  dayDate: string,
  blockKey: string | null,
  input: { activityId?: string | null; title: string; notes?: string | null },
): Promise<{ entry: ProgramEntry } | { error: string }> {
  const supabase = await createClient();
  const owned = await requireOwnerForProgram(supabase, programId);
  if (!owned) return { error: "Not authorised" };

  const title = input.title.trim();
  if (!title) return { error: "Title is required" };

  let eylfCodes: string[] = [];
  if (input.activityId) {
    const activity = await getActivity(input.activityId);
    if (activity) eylfCodes = activity.eylf_codes;
  }

  let orderQuery = supabase
    .from("program_entries")
    .select("order_index")
    .eq("program_id", programId)
    .eq("day_date", dayDate);
  orderQuery = blockKey ? orderQuery.eq("block_key", blockKey) : orderQuery.is("block_key", null);
  const { data: siblings } = await orderQuery;
  const orderIndex = siblings && siblings.length > 0 ? Math.max(...siblings.map((s) => s.order_index)) + 1 : 0;

  const { data: inserted, error } = await supabase
    .from("program_entries")
    .insert({
      program_id: programId,
      day_date: dayDate,
      block_key: blockKey,
      title,
      notes: input.notes?.trim() || null,
      activity_id: input.activityId || null,
      eylf_codes: eylfCodes,
      order_index: orderIndex,
    })
    .select("*")
    .single();

  if (error || !inserted) return { error: error?.message ?? "Could not add entry" };

  revalidatePath(`/programs/${programId}`);
  return { entry: inserted };
}

export async function updateProgramEntry(
  entryId: string,
  programId: string,
  updates: {
    title?: string;
    notes?: string | null;
    blockKey?: string | null;
    orderIndex?: number;
    activityId?: string | null;
    steps?: string[];
  },
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const owned = await requireOwnerForProgram(supabase, programId);
  if (!owned) return { error: "Not authorised" };

  const { error } = await supabase
    .from("program_entries")
    .update({
      ...(updates.title !== undefined ? { title: updates.title } : {}),
      ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
      ...(updates.blockKey !== undefined ? { block_key: updates.blockKey } : {}),
      ...(updates.orderIndex !== undefined ? { order_index: updates.orderIndex } : {}),
      ...(updates.activityId !== undefined ? { activity_id: updates.activityId } : {}),
      ...(updates.steps !== undefined ? { steps: updates.steps } : {}),
    })
    .eq("id", entryId)
    .eq("program_id", programId);

  if (error) return { error: error.message };
  revalidatePath(`/programs/${programId}`);
  return { ok: true };
}

export async function deleteProgramEntry(entryId: string, programId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const owned = await requireOwnerForProgram(supabase, programId);
  if (!owned) return { error: "Not authorised" };

  const { error } = await supabase.from("program_entries").delete().eq("id", entryId).eq("program_id", programId);
  if (error) return { error: error.message };
  revalidatePath(`/programs/${programId}`);
  return { ok: true };
}

export async function swapProgramEntryOrder(
  programId: string,
  entryA: { id: string; orderIndex: number },
  entryB: { id: string; orderIndex: number },
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const owned = await requireOwnerForProgram(supabase, programId);
  if (!owned) return { error: "Not authorised" };

  const [resA, resB] = await Promise.all([
    supabase.from("program_entries").update({ order_index: entryB.orderIndex }).eq("id", entryA.id).eq("program_id", programId),
    supabase.from("program_entries").update({ order_index: entryA.orderIndex }).eq("id", entryB.id).eq("program_id", programId),
  ]);
  if (resA.error) return { error: resA.error.message };
  if (resB.error) return { error: resB.error.message };

  revalidatePath(`/programs/${programId}`);
  return { ok: true };
}

export async function updateProgramBlocks(
  programId: string,
  blocks: ProgramBlock[],
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const owned = await requireOwnerForProgram(supabase, programId);
  if (!owned) return { error: "Not authorised" };

  const { error } = await supabase.from("programs").update({ blocks }).eq("id", programId);
  if (error) return { error: error.message };
  revalidatePath(`/programs/${programId}`);
  return { ok: true };
}

export async function setProgramStatus(
  programId: string,
  status: ProgramStatus,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const owned = await requireOwnerForProgram(supabase, programId);
  if (!owned) return { error: "Not authorised" };

  const { error } = await supabase.from("programs").update({ status }).eq("id", programId);
  if (error) return { error: error.message };
  revalidatePath(`/programs/${programId}`);
  revalidatePath(`/programs/${programId}/calendar`);
  return { ok: true };
}
