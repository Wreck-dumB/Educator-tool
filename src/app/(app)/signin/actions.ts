"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

function todayDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

// ── Children ──────────────────────────────────────────────────────────────────

export async function signInChild(childId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const signedInBy = profile?.display_name ?? user.email ?? "Staff";

  const date = todayDate();

  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id, status")
    .eq("owner_user_id", ownerUserId)
    .eq("child_id", childId)
    .eq("date", date)
    .maybeSingle();

  if (!existing) {
    await supabase.from("attendance_records").insert({
      owner_user_id: ownerUserId,
      child_id: childId,
      date,
      status: "signed_in",
      signed_in_at: new Date().toISOString(),
      signed_in_by: signedInBy,
    });
  } else if (existing.status === "signed_out") {
    await supabase
      .from("attendance_records")
      .update({
        status: "signed_in",
        signed_in_at: new Date().toISOString(),
        signed_in_by: signedInBy,
        signed_out_at: null,
        signed_out_by: null,
      })
      .eq("id", existing.id);
  }

  revalidatePath("/signin");
  revalidatePath("/onsite");
  revalidatePath("/attendance");
  return {};
}

export async function signOutChild(childId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const signedOutBy = profile?.display_name ?? user.email ?? "Staff";

  const date = todayDate();

  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id, status")
    .eq("owner_user_id", ownerUserId)
    .eq("child_id", childId)
    .eq("date", date)
    .maybeSingle();

  if (existing?.status === "signed_in") {
    await supabase
      .from("attendance_records")
      .update({
        status: "signed_out",
        signed_out_at: new Date().toISOString(),
        signed_out_by: signedOutBy,
      })
      .eq("id", existing.id);
  }

  revalidatePath("/signin");
  revalidatePath("/onsite");
  revalidatePath("/attendance");
  return {};
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export async function signInStaff(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const date = todayDate();

  const { error } = await supabase.from("staff_attendance").upsert(
    {
      owner_user_id: ownerUserId,
      user_id: user.id,
      date,
      signed_in_at: new Date().toISOString(),
      signed_out_at: null,
    },
    { onConflict: "owner_user_id,user_id,date" }
  );

  if (error) return { error: error.message };

  revalidatePath("/signin");
  revalidatePath("/onsite");
  return {};
}

export async function signOutStaff(staffUserId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service" };

  const date = todayDate();

  const { error } = await supabase
    .from("staff_attendance")
    .update({ signed_out_at: new Date().toISOString() })
    .eq("owner_user_id", ownerUserId)
    .eq("user_id", staffUserId)
    .eq("date", date)
    .is("signed_out_at", null);

  if (error) return { error: error.message };

  revalidatePath("/signin");
  revalidatePath("/onsite");
  return {};
}

// ── Visitors ──────────────────────────────────────────────────────────────────

export async function addVisitor(
  name: string,
  company: string,
  reason: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!name.trim()) return { error: "Name is required" };
  if (!reason.trim()) return { error: "Reason for visit is required" };

  const date = todayDate();

  const { error } = await supabase.from("visitors").insert({
    owner_user_id: ownerUserId,
    name: name.trim(),
    company: company.trim() || null,
    reason: reason.trim(),
    signed_in_by: user.id,
    date,
  });

  if (error) return { error: error.message };

  revalidatePath("/signin");
  revalidatePath("/onsite");
  return {};
}

export async function signOutVisitor(visitorId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service" };

  const { error } = await supabase
    .from("visitors")
    .update({ signed_out_at: new Date().toISOString() })
    .eq("id", visitorId)
    .eq("owner_user_id", ownerUserId)
    .is("signed_out_at", null);

  if (error) return { error: error.message };

  revalidatePath("/signin");
  revalidatePath("/onsite");
  return {};
}
