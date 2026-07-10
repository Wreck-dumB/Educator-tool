"use server";

import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ShiftType } from "@/lib/types/database.types";

export async function createHandoverNote(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/staff/onboard");

  const shiftDate = formData.get("shift_date") as string;
  const shiftType = formData.get("shift_type") as ShiftType;
  const generalNotes = (formData.get("general_notes") as string) || null;
  const childrenNotes = (formData.get("children_notes") as string) || null;
  const medicationSummary = (formData.get("medication_summary") as string) || null;
  const incidentsSummary = (formData.get("incidents_summary") as string) || null;
  const outstandingTasks = (formData.get("outstanding_tasks") as string) || null;

  if (!shiftDate || !shiftType) {
    redirect("/handover?error=Shift+date+and+type+are+required");
  }

  const { error } = await supabase.from("shift_handover_notes").insert({
    owner_user_id: ownerUserId,
    shift_date: shiftDate,
    shift_type: shiftType,
    written_by_user_id: user.id,
    general_notes: generalNotes,
    children_notes: childrenNotes,
    medication_summary: medicationSummary,
    incidents_summary: incidentsSummary,
    outstanding_tasks: outstandingTasks,
  });

  if (error) redirect(`/handover?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/handover");
  redirect("/handover");
}

export async function acknowledgeHandover(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("shift_handover_notes")
    .update({ acknowledged_by_user_id: user.id, acknowledged_at: new Date().toISOString() })
    .eq("id", id)
    .is("acknowledged_at", null);

  revalidatePath("/handover");
}

export async function deleteHandoverNote(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("shift_handover_notes").delete().eq("id", id);
  revalidatePath("/handover");
}
