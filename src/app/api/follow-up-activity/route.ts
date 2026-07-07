import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFollowUpActivity } from "@/lib/anthropic";
import { getEylfOutcomes } from "@/lib/supabase/eylf";
import { isRateLimited } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (isRateLimited(`follow-up:${user.id}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Rate limit reached — try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const observationNote = typeof body?.observationNote === "string" ? body.observationNote.slice(0, 2000) : "";
  const childName = typeof body?.childName === "string" ? body.childName.slice(0, 100) : "this child";
  const childInterests = typeof body?.childInterests === "string" ? body.childInterests.slice(0, 500) : null;
  const eylfCodes = Array.isArray(body?.eylfCodes) ? (body.eylfCodes as string[]).slice(0, 10) : [];
  const previousActivityTitle = typeof body?.previousActivityTitle === "string" ? body.previousActivityTitle : null;

  if (!observationNote) {
    return NextResponse.json({ error: "Observation note is required" }, { status: 400 });
  }

  const outcomes = await getEylfOutcomes();
  const activity = await generateFollowUpActivity(
    { observationNote, childName, childInterests, eylfCodes, previousActivityTitle },
    outcomes,
  );

  return NextResponse.json(activity);
}
