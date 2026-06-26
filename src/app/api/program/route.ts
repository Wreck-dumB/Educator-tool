import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEylfOutcomes, getOutcomeCoverage } from "@/lib/supabase/eylf";
import { getActivities } from "@/lib/supabase/activities";
import { generateCulturalDays, generateProgram, type RawCulturalDay } from "@/lib/anthropic";
import { isRateLimited } from "@/lib/rateLimit";
import { withBathurst1000 } from "@/lib/bathurst1000";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`program:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You've hit the generation limit for now — try again in a bit." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const startDate = typeof body?.startDate === "string" ? body.startDate : "";
  const endDate = typeof body?.endDate === "string" ? body.endDate : "";
  const educatorNotes =
    typeof body?.educatorNotes === "string" ? body.educatorNotes.trim().slice(0, 1000) : undefined;

  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate) || endDate < startDate) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }
  const spanDays = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
  if (spanDays > 31) {
    return NextResponse.json({ error: "Programs are limited to 31 days at a time" }, { status: 400 });
  }

  const outcomes = await getEylfOutcomes();
  if (outcomes.length === 0) {
    return NextResponse.json({ error: "EYLF outcome data is not seeded" }, { status: 500 });
  }
  const validCodes = new Set(outcomes.map((o) => o.code));

  const [coverage, activities] = await Promise.all([getOutcomeCoverage(30), getActivities()]);
  const existingActivities = activities.slice(0, 30).map((a) => ({ title: a.title, eylfCodes: a.eylf_codes }));
  const activityByTitle = new Map(activities.map((a) => [a.title.trim().toLowerCase(), a.id]));

  let culturalDays: RawCulturalDay[];
  try {
    culturalDays = await generateCulturalDays(startDate, endDate);
  } catch (err) {
    console.error("Cultural days generation failed — still including non-negotiable entries", err);
    culturalDays = [];
  }
  // Bathurst 1000 is always included regardless of the AI lookup outcome,
  // and merged in before program generation so it can be woven into an
  // entry like any other cultural day.
  culturalDays = withBathurst1000(culturalDays, startDate, endDate);

  let rawEntries;
  try {
    rawEntries = await generateProgram(
      startDate,
      endDate,
      outcomes,
      coverage,
      culturalDays,
      existingActivities,
      educatorNotes,
    );
  } catch (err) {
    console.error("Program generation failed", err);
    return NextResponse.json({ error: "Failed to generate program" }, { status: 502 });
  }

  const entries = rawEntries
    .filter((e) => DATE_RE.test(e.day_date) && e.day_date >= startDate && e.day_date <= endDate)
    .map((e) => ({
      dayDate: e.day_date,
      title: e.title,
      notes: e.notes ?? null,
      eylfCodes: (e.eylf_codes ?? []).filter((c) => validCodes.has(c)),
      activityId: e.reused_activity_title
        ? activityByTitle.get(e.reused_activity_title.trim().toLowerCase()) ?? null
        : null,
    }));

  return NextResponse.json({
    entries,
    culturalDays: culturalDays.filter((d) => DATE_RE.test(d.date) && d.date >= startDate && d.date <= endDate),
  });
}
