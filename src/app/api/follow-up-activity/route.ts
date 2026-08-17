import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFollowUpActivity } from "@/lib/anthropic";
import { getEylfOutcomes } from "@/lib/supabase/eylf";
import { isRateLimited } from "@/lib/rateLimit";
import { redactEnrolledChildNames } from "@/lib/childNameGuard";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (await isRateLimited(`follow-up:${user.id}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Rate limit reached — try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const rawObservationNote = typeof body?.observationNote === "string" ? body.observationNote.slice(0, 2000) : "";
  const rawChildInterests = typeof body?.childInterests === "string" ? body.childInterests.slice(0, 500) : null;
  const eylfCodes = Array.isArray(body?.eylfCodes) ? (body.eylfCodes as string[]).slice(0, 10) : [];
  const previousActivityTitle = typeof body?.previousActivityTitle === "string" ? body.previousActivityTitle : null;

  if (!rawObservationNote) {
    return NextResponse.json({ error: "Observation note is required" }, { status: 400 });
  }

  // This note text comes straight from the client (the educator's own
  // observation) and routinely names the child — redact before it reaches
  // the AI prompt. See childNameGuard.ts.
  const observationNote = await redactEnrolledChildNames(rawObservationNote);
  const childInterests = rawChildInterests ? await redactEnrolledChildNames(rawChildInterests) : null;

  const outcomes = await getEylfOutcomes();
  const activity = await generateFollowUpActivity(
    { observationNote, childInterests, eylfCodes, previousActivityTitle },
    outcomes,
  );

  return NextResponse.json(activity);
}
