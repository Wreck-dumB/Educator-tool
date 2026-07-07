"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const childId = formData.get("child_id") as string;
  const date = formData.get("date") as string;
  const signedInBy = (formData.get("signed_in_by") as string)?.trim() || null;

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  await supabase.from("attendance_records").upsert(
    {
      owner_user_id: ownerUserId,
      child_id: childId,
      date,
      status: "signed_in",
      signed_in_at: new Date().toISOString(),
      signed_in_by: signedInBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_user_id,child_id,date" },
  );

  revalidatePath("/attendance");
}

export async function signOut(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const childId = formData.get("child_id") as string;
  const date = formData.get("date") as string;
  const signedOutBy = (formData.get("signed_out_by") as string)?.trim() || null;

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  await supabase
    .from("attendance_records")
    .update({
      status: "signed_out",
      signed_out_at: new Date().toISOString(),
      signed_out_by: signedOutBy,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_user_id", ownerUserId)
    .eq("child_id", childId)
    .eq("date", date);

  revalidatePath("/attendance");
}

export async function markAbsent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const childId = formData.get("child_id") as string;
  const date = formData.get("date") as string;

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  await supabase.from("attendance_records").upsert(
    {
      owner_user_id: ownerUserId,
      child_id: childId,
      date,
      status: "absent",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_user_id,child_id,date" },
  );

  revalidatePath("/attendance");
}

export async function undoAttendance(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const childId = formData.get("child_id") as string;
  const date = formData.get("date") as string;

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  await supabase
    .from("attendance_records")
    .delete()
    .eq("owner_user_id", ownerUserId)
    .eq("child_id", childId)
    .eq("date", date);

  revalidatePath("/attendance");
}
