import { createClient } from "@/lib/supabase/server";
import type { StaffMembership, StaffInvite, Service } from "@/lib/types/domain";

export async function getMyService(): Promise<Service | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("services").select("*").maybeSingle();
  return data ?? null;
}

export async function getMyStaffRole(): Promise<"director" | "2ic" | "staff" | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("staff_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  return (data?.role ?? null) as "director" | "2ic" | "staff" | null;
}

export interface StaffMemberWithName extends StaffMembership {
  displayName: string;
}

export async function getStaffMembers(serviceId: string): Promise<StaffMemberWithName[]> {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("staff_memberships")
    .select("*")
    .eq("service_id", serviceId)
    .order("created_at");

  if (!memberships || memberships.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", memberships.map((m) => m.user_id));

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  // A missing profiles row shouldn't be possible via the normal signup flow
  // (display_name is NOT NULL there) - seen live only on a QA fixture account
  // created directly via SQL rather than real signup. Labelled distinctly
  // from a genuine "Unknown" so it reads as a data gap, not a person.
  return memberships.map((m) => ({ ...m, displayName: nameById.get(m.user_id) ?? "(no profile set up)" }));
}

export async function getStaffInvites(serviceId: string): Promise<StaffInvite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_invites")
    .select("*")
    .eq("service_id", serviceId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
