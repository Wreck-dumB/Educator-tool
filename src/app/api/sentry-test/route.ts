import { NextResponse } from "next/server";

// Temporary — verifies Sentry captures a real production error end to end.
// Deleted immediately after confirming in the Sentry dashboard.
export async function GET() {
  throw new Error("Sentry production test error — delete me");
  // eslint-disable-next-line no-unreachable
  return NextResponse.json({ ok: true });
}
