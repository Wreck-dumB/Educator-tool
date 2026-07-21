import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export interface ShiftAccessState {
  role: "director" | "2ic" | "staff" | null;
  /** Whether this user is subject to the on-shift rule (regular staff only). */
  restricted: boolean;
  /** Currently signed in for a shift today. */
  onShift: boolean;
  /** May view children's information right now. */
  allowed: boolean;
}

/**
 * App-level "staff can only see children's information while on shift" check.
 * Regular staff must be signed in for a shift today (a staff_attendance row with
 * no sign-out) to view child data. Directors, 2ICs, and the service owner are
 * not restricted. This is a UX-level gate; it is not enforced at the database
 * (RLS) layer — see NEXT.md for the hardening option.
 */
export async function getShiftAccess(): Promise<ShiftAccessState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { role: null, restricted: false, onShift: false, allowed: false };

  const { data: memberships } = await supabase
    .from("staff_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("status", "active");

  const roles = (memberships ?? []).map((m) => m.role);
  const role: ShiftAccessState["role"] = roles.includes("director")
    ? "director"
    : roles.includes("2ic")
      ? "2ic"
      : roles.includes("staff")
        ? "staff"
        : null;

  // Only regular staff are shift-restricted; managers/owner always allowed.
  if (role !== "staff") {
    return { role, restricted: false, onShift: true, allowed: true };
  }

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) {
    return { role, restricted: true, onShift: false, allowed: false };
  }

  // Local (AEST) calendar date, matching how sign-ins are recorded.
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Australia/Sydney" });

  const { data: att } = await supabase
    .from("staff_attendance")
    .select("id")
    .eq("owner_user_id", ownerUserId)
    .eq("user_id", user.id)
    .eq("date", today)
    .is("signed_out_at", null)
    .maybeSingle();

  const onShift = !!att;
  return { role, restricted: true, onShift, allowed: onShift };
}
