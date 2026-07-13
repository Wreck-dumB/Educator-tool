import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { generateTransitionStatement } from "@/lib/anthropic";
import { isRateLimited } from "@/lib/rateLimit";
import { getObservations } from "@/lib/supabase/observations";
import { ageInMonths } from "@/lib/nqf";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`transition:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Generation limit reached — try again in an hour." },
      { status: 429 },
    );
  }

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) {
    return NextResponse.json({ error: "No active service membership" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const childId = typeof body?.childId === "string" ? body.childId : null;
  const transitionType = body?.transitionType as string | undefined;

  if (!childId || !["to_school", "between_rooms", "between_services"].includes(transitionType ?? "")) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // RLS scopes this to the current service's children
  const { data: child } = await supabase
    .from("children")
    .select("id, date_of_birth, current_interests")
    .eq("id", childId)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const observations = await getObservations(childId);
  const recentObs = observations.slice(0, 8).map((o) => ({
    noteText: o.note_text,
    observedAt: o.observed_at,
    eylfCodes: [],
  }));

  let raw;
  try {
    raw = await generateTransitionStatement({
      transitionType: transitionType as "to_school" | "between_rooms" | "between_services",
      childAgeMonths: child.date_of_birth ? ageInMonths(child.date_of_birth) : null,
      childInterests: child.current_interests,
      recentObservations: recentObs,
    });
  } catch (err) {
    console.error("Transition statement generation failed", err);
    return NextResponse.json({ error: "Failed to generate transition statement" }, { status: 502 });
  }

  const fullText = [
    raw.opening,
    "",
    "**Strengths and achievements**",
    raw.strengths,
    "",
    "**Interests and learning style**",
    raw.interests_and_learning_style,
    "",
    "**Social and emotional development**",
    raw.social_and_emotional,
    "",
    "**Suggested next steps**",
    raw.next_steps,
    "",
    "**Family partnership**",
    raw.family_note,
  ].join("\n");

  return NextResponse.json({ text: fullText });
}
