import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSafeWorkProcedure, scoreHazards } from "@/lib/anthropic";
import { isRateLimited } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`swp:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You've hit the generation limit for now — try again in a bit." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const taskTitle = typeof body?.taskTitle === "string" ? body.taskTitle.trim().slice(0, 120) : "";
  const taskDescription = typeof body?.taskDescription === "string" ? body.taskDescription.trim().slice(0, 2000) : "";
  if (!taskTitle || !taskDescription) {
    return NextResponse.json({ error: "Task title and description are required" }, { status: 400 });
  }

  let raw;
  try {
    raw = await generateSafeWorkProcedure(taskTitle, taskDescription);
  } catch (err) {
    console.error("Safe work procedure generation failed", err);
    return NextResponse.json({ error: "Failed to generate safe work procedure" }, { status: 502 });
  }

  return NextResponse.json({
    ppeRequired: raw.ppe_required ?? [],
    steps: raw.steps ?? [],
    hazards: scoreHazards(raw.hazards ?? []),
  });
}
