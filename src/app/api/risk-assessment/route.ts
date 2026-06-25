import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRiskAssessment, scoreHazards } from "@/lib/anthropic";
import { isRateLimited } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`risk:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You've hit the generation limit for now — try again in a bit." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const activityId = typeof body?.activityId === "string" ? body.activityId : null;
  if (!activityId) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // RLS scopes this to the current user's own activities — a cross-user ID just returns null.
  const { data: activity } = await supabase
    .from("generated_activities")
    .select("*")
    .eq("id", activityId)
    .maybeSingle();

  if (!activity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  let raw;
  try {
    raw = await generateRiskAssessment(activity);
  } catch (err) {
    console.error("Risk assessment generation failed", err);
    return NextResponse.json({ error: "Failed to generate risk assessment" }, { status: 502 });
  }

  return NextResponse.json({
    contextNotes: raw.context_notes ?? null,
    hazards: scoreHazards(raw.hazards ?? []),
    involvesExcursion: raw.involves_excursion,
    involvesSleepRest: raw.involves_sleep_rest,
    involvesWater: raw.involves_water,
  });
}
