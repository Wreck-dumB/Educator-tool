// Simple in-memory sliding-window limiter. This resets on cold start and is
// per-instance only — fine for a single-user personal trial, but should move
// to a shared store (e.g. a Supabase table or Upstash) before multi-user use.
const requestLog = new Map<string, number[]>();

export function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= maxRequests) {
    requestLog.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  requestLog.set(key, timestamps);
  return false;
}
