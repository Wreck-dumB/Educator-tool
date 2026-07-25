import { createClient } from "@/lib/supabase/server";

export type AccessStatus = "trial" | "active" | "suspended" | "expired";

export interface ServiceAccessState {
  /** The service's access status, or null if no row exists yet. */
  status: AccessStatus | null;
  /** Trial end date (ISO), if a trial has an explicit expiry. */
  trialEndsAt: string | null;
  /** Whether this service may use the app right now. */
  allowed: boolean;
}

/**
 * Returns whether the given email belongs to a platform owner (Dan). Owners
 * manage the business register and are never subject to the access gate.
 * Configured via PLATFORM_OWNER_EMAILS (comma-separated). If unset, there are
 * no platform owners (the /owner dashboard is simply inaccessible until set).
 */
export function isPlatformOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.PLATFORM_OWNER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

/**
 * App-level access gate. Resolves the current user's service access status via
 * RLS (each user can read only their own service's row) and decides whether the
 * app should be usable right now.
 *
 * Fails OPEN: if no access row is visible (e.g. mid-onboarding, or a service
 * predating the register), the user is allowed through. During the test phase
 * the cost of a false lock-out is far worse than a missed gate; the register is
 * the source of truth for who is switched off, not who is switched on.
 */
export async function getServiceAccess(): Promise<ServiceAccessState> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("service_access")
    .select("status, trial_ends_at")
    .limit(1);

  const row = data?.[0];
  if (!row) return { status: null, trialEndsAt: null, allowed: true };

  const status = row.status as AccessStatus;
  const trialEndsAt = row.trial_ends_at;

  let allowed: boolean;
  switch (status) {
    case "active":
      allowed = true;
      break;
    case "trial":
      // A trial with no end date never expires; otherwise honour the date.
      allowed = !trialEndsAt || new Date(trialEndsAt).getTime() > Date.now();
      break;
    case "suspended":
    case "expired":
    default:
      allowed = false;
  }

  return { status, trialEndsAt, allowed };
}
