import { createClient } from "@/lib/supabase/server";

/**
 * Resolves the owner_user_id (always the Director's auth.users.id) that
 * the caller's "create a new row" actions should use. A 2IC or general
 * staff member's own auth.uid() is never a valid owner_user_id -- every
 * owner-scoped table's RLS checks has_service_role(owner_user_id, ...),
 * which only resolves correctly against the Director's id.
 *
 * Returns null if the caller has no active staff membership at all (e.g.
 * mid-onboarding, before they've started a service or redeemed an invite)
 * -- callers must handle this rather than assuming it's always set.
 */
export async function getMyServiceOwnerId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_service_owner_id");
  return data ?? null;
}
