import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActivity } from "@/lib/supabase/activities";
import { getObservations } from "@/lib/supabase/observations";
import { getEylfOutcomes } from "@/lib/supabase/eylf";
import { personaliseActivity, type ChildObservationSummary } from "@/lib/anthropic";
import { isRateLimited } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (isRateLimited(user.id, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Generation limit reached — try again in a bit." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { activityId, childId } = body;
  if (typeof activityId !== "string" || !activityId) {
    return NextResponse.json({ error: "activityId is required" }, { status: 400 });
  }

  // Load the original activity with EYLF codes — RLS scopes this to the caller's service
  const activity = await getActivity(activityId);
  if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

  // Child context — trust DB, not client. Deliberately not including first_name
  // — the AI only needs interests/needs/observations to personalise, not the child's identity.
  let interests: string | null = null;
  let additionalNeeds: string | null = null;
  let recentObservations: ChildObservationSummary[] = [];

  if (typeof childId === "string" && childId) {
    const { data: child } = await supabase
      .from("children")
      .select("current_interests, additional_needs")
      .eq("id", childId)
      .maybeSingle();

    if (child) {
      interests = child.current_interests ?? null;
      additionalNeeds = child.additional_needs ?? null;
      const obs = await getObservations(childId);
      recentObservations = obs.slice(0, 5).map((o) => ({
        noteText: o.note_text.slice(0, 300),
        observedAt: new Date(o.observed_at).toLocaleDateString(),
        eylfCodes: o.eylf_codes,
      }));
    }
  }

  if (typeof body.additionalNeeds === "string" && body.additionalNeeds.trim()) {
    additionalNeeds = body.additionalNeeds.trim().slice(0, 500);
  }
  if (typeof body.interests === "string" && body.interests.trim()) {
    interests = body.interests.trim().slice(0, 200);
  }

  const outcomes = await getEylfOutcomes();
  const validCodes = new Set(outcomes.map((o) => o.code));

  let result;
  try {
    result = await personaliseActivity(
      activity,
      interests,
      additionalNeeds,
      recentObservations,
      outcomes,
    );
  } catch (err) {
    console.error("Personalisation failed", err);
    return NextResponse.json({ error: "Failed to personalise activity" }, { status: 502 });
  }

  return NextResponse.json({
    title: result.title,
    summary: result.summary,
    steps: result.steps ?? [],
    materialsUsed: result.materials_used ?? [],
    reflectionPrompts: result.reflection_prompts ?? [],
    adaptationNotes: result.adaptation_notes ?? [],
    eylfCodes: (result.eylf_codes ?? []).filter((c) => validCodes.has(c)),
    // Pass-through from original so the save action has everything it needs
    ageRange: activity.age_range ?? null,
    durationMinutes: activity.duration_minutes ?? null,
    energyLevel: activity.energy_level ?? null,
    groupSizeFit: activity.group_size_fit ?? null,
    suggestedTemplate: null,
  });
}
