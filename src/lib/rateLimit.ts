import { createAdminClient } from "@/lib/supabase/admin";

// Shared-store fixed-window limiter backed by Supabase (migration 0062), so the
// count is enforced across serverless instances and survives cold starts —
// replaces the old in-memory Map, which reset per instance and wasn't actually
// shared once more than one instance was warm.
export async function isRateLimited(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("increment_rate_limit", {
    p_key: key,
    p_window_start: windowStart,
  });

  if (error) {
    // Fail open — a counter-table hiccup shouldn't take down every AI route.
    console.error("rate limit check failed:", error);
    return false;
  }

  return (data as number) > maxRequests;
}
