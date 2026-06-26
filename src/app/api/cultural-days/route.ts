import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCulturalDays } from "@/lib/anthropic";
import { isRateLimited } from "@/lib/rateLimit";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Lightweight cultural/national-day lookup for the calendar browser — just
 * the day list, no program generation. Separate from /api/program so
 * browsing months around doesn't cost a full program-generation call.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`cultural-days:${user.id}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You've hit the lookup limit for now — try again in a bit." },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start") ?? "";
  const endDate = searchParams.get("end") ?? "";

  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate) || endDate < startDate) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }
  const spanDays = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
  if (spanDays > 45) {
    return NextResponse.json({ error: "Range too large" }, { status: 400 });
  }

  try {
    const days = await generateCulturalDays(startDate, endDate);
    return NextResponse.json({ days });
  } catch (err) {
    console.error("Cultural days lookup failed", err);
    return NextResponse.json({ error: "Failed to look up cultural days" }, { status: 502 });
  }
}
