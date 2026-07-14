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

  // Notify linked parents with a day recap link
  const [childRes, linksRes] = await Promise.all([
    supabase.from("children").select("first_name").eq("id", childId).maybeSingle(),
    supabase
      .from("parent_child_links")
      .select("parent_user_id")
      .eq("child_id", childId)
      .eq("educator_user_id", ownerUserId),
  ]);

  const childName = childRes.data?.first_name ?? "Your child";
  const links = linksRes.data ?? [];
  if (links.length > 0) {
    await supabase.from("parent_notifications").insert(
      links.map((link) => ({
        recipient_user_id: link.parent_user_id,
        type: "daily_summary" as const,
        title: `${childName}'s day recap is ready`,
        body: `See what ${childName} got up to today — meals, nappy changes, activities and more.`,
        href: `/parent/diary?child=${childId}&date=${date}`,
      })),
    );
  }

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

export async function updateWellbeing(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const childId = formData.get("child_id") as string;
  const date = formData.get("date") as string;
  const level = parseInt(formData.get("wellbeing_level") as string, 10);
  const note = (formData.get("wellbeing_note") as string)?.trim() || null;

  if (!childId || !date || isNaN(level) || level < 1 || level > 5) return;

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  await supabase
    .from("attendance_records")
    .update({ wellbeing_level: level, wellbeing_note: note })
    .eq("owner_user_id", ownerUserId)
    .eq("child_id", childId)
    .eq("date", date);

  revalidatePath("/attendance");
}

export async function updateRoomStaffCount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const roomId = formData.get("room_id") as string;
  const date = formData.get("date") as string;
  const delta = parseInt(formData.get("delta") as string, 10);

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  // Read current count, clamp delta so it never goes below 0
  const { data: existing } = await supabase
    .from("room_staff_counts")
    .select("staff_count")
    .eq("owner_user_id", ownerUserId)
    .eq("room_id", roomId)
    .eq("date", date)
    .maybeSingle();

  const current = existing?.staff_count ?? 0;
  const next = Math.max(0, current + delta);

  await supabase.from("room_staff_counts").upsert(
    {
      owner_user_id: ownerUserId,
      room_id: roomId,
      date,
      staff_count: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_user_id,room_id,date" },
  );

  revalidatePath("/attendance");
}
