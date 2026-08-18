import { createAdminClient } from "@/lib/supabase/admin";

// Shared-store fixed-window limiter backed by Supabase (migration 0062), so the
// count is enforced across serverless instances and survives cold starts —
// replaces the old in-memory Map, which reset per instance and wasn't actually
// shared once more than one instance was warm.
export async function isRateLimited(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
  // The whole body is guarded, not just the RPC's own error return - a
  // synchronous throw from createAdminClient() (e.g. a missing/misconfigured
  // SUPABASE_SERVICE_ROLE_KEY) used to be uncaught here, taking down every
  // route that calls isRateLimited() before it ever reached the route's own
  // try/catch - an opaque, unhelpful empty 500 across ~20+ AI/rate-limited
  // routes, misread more than once as an Anthropic billing outage. A rate
  // limiter should never be why a real feature is unreachable.
  try {
    const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("increment_rate_limit", {
      p_key: key,
      p_window_start: windowStart,
    });

    if (error) {
      console.error("rate limit check failed:", error);
      return false;
    }

    return (data as number) > maxRequests;
  } catch (err) {
    console.error("rate limit check threw:", err);
    return false;
  }
}
