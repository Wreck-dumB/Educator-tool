import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDailyRoutine, type DailyRoutineInput } from "@/lib/anthropic";
import { isRateLimited } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (isRateLimited(`routine:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Rate limit reached — try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);

  const input: DailyRoutineInput = {
    date: typeof body?.date === "string" ? body.date : new Date().toISOString().slice(0, 10),
    dayName: typeof body?.dayName === "string" ? body.dayName : "",
    childCount: typeof body?.childCount === "number" ? body.childCount : 10,
    ageRange: typeof body?.ageRange === "string" ? body.ageRange : undefined,
    roomName: typeof body?.roomName === "string" ? body.roomName : undefined,
    focusTopic: typeof body?.focusTopic === "string" ? body.focusTopic : undefined,
    plannedActivities: Array.isArray(body?.plannedActivities)
      ? (body.plannedActivities as unknown[]).filter((a): a is string => typeof a === "string").slice(0, 10)
      : [],
  };

  const blocks = await generateDailyRoutine(input);
  return NextResponse.json({ blocks });
}
