import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEylfOutcomes } from "@/lib/supabase/eylf";
import { getObservations } from "@/lib/supabase/observations";
import { generateActivitySuggestions, type GenerationInput } from "@/lib/anthropic";
import { isRateLimited } from "@/lib/rateLimit";
import type { ActivitySuggestion } from "@/lib/types/domain";

const VALID_MODES = ["materials", "time", "outcome", "interest", "surprise_me"];
const VALID_GROUP_SIZES = ["solo", "small_group", "whole_group"];
const VALID_ENERGY_LEVELS = ["calm", "moderate", "high"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(user.id, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You've hit the generation limit for now — try again in a bit." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const mode = body.mode;
  if (!VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const input: GenerationInput = { mode, surpriseMe: body.surpriseMe === true };

  if (Array.isArray(body.materials)) {
    input.materials = body.materials
      .filter((m: unknown) => typeof m === "string")
      .slice(0, 30)
      .map((m: string) => m.trim().slice(0, 80))
      .filter(Boolean);
  }

  if (typeof body.timeMinutes === "number" && body.timeMinutes > 0 && body.timeMinutes <= 240) {
    input.timeMinutes = Math.round(body.timeMinutes);
  }

  if (typeof body.groupSize === "string" && VALID_GROUP_SIZES.includes(body.groupSize)) {
    input.groupSize = body.groupSize;
  }

  if (typeof body.energyLevel === "string" && VALID_ENERGY_LEVELS.includes(body.energyLevel)) {
    input.energyLevel = body.energyLevel;
  }

  if (Array.isArray(body.targetOutcomeCodes)) {
    input.targetOutcomeCodes = body.targetOutcomeCodes
      .filter((c: unknown) => typeof c === "string")
      .slice(0, 10);
  }

  if (typeof body.childInterest === "string") {
    input.childInterest = body.childInterest.trim().slice(0, 200) || undefined;
  }

  if (typeof body.additionalNeeds === "string") {
    input.additionalNeeds = body.additionalNeeds.trim().slice(0, 500) || undefined;
  }

  if (typeof body.targetAgeBracket === "string") {
    input.targetAgeBracket = body.targetAgeBracket.trim().slice(0, 80) || undefined;
  }

  if (typeof body.targetMilestone === "string") {
    input.targetMilestone = body.targetMilestone.trim().slice(0, 300) || undefined;
  }

  const count =
    typeof body.count === "number" && body.count >= 1
      ? Math.min(Math.round(body.count), 10)
      : 5;

  // Resolve the focus child server-side rather than trusting client-supplied
  // history — RLS scopes this to the caller's own children/observations
  // regardless, but fetching the real rows also means we can't be fed a
  // fabricated observation history for a real child.
  if (typeof body.childId === "string" && body.childId) {
    const { data: child } = await supabase
      .from("children")
      .select("first_name, current_interests, additional_needs")
      .eq("id", body.childId)
      .maybeSingle();

    if (child) {
      // Deliberately not including child.first_name in the AI prompt —
      // the model doesn't need the actual name to personalise activities,
      // and sending a name + medical/behavioural data to a third-party API
      // is an unnecessary PII disclosure under the Australian Privacy Act.
      if (!input.childInterest && child.current_interests) {
        input.childInterest = child.current_interests;
      }
      if (!input.additionalNeeds && child.additional_needs) {
        input.additionalNeeds = child.additional_needs;
      }
      const observations = await getObservations(body.childId);
      input.childRecentObservations = observations.slice(0, 5).map((o) => ({
        noteText: o.note_text.slice(0, 300),
        observedAt: new Date(o.observed_at).toLocaleDateString(),
        eylfCodes: o.eylf_codes,
      }));
    }
  }

  const outcomes = await getEylfOutcomes();
  if (outcomes.length === 0) {
    return NextResponse.json({ error: "EYLF outcome data is not seeded" }, { status: 500 });
  }
  const validCodes = new Set(outcomes.map((o) => o.code));

  let raw;
  try {
    raw = await generateActivitySuggestions(input, outcomes, count);
  } catch (err) {
    console.error("Generation failed", err);
    return NextResponse.json({ error: "Failed to generate activities" }, { status: 502 });
  }

  const VALID_TEMPLATES = new Set(["name_trace", "drawing_frame", "writing_lines"]);
  const suggestions: ActivitySuggestion[] = raw.map((activity) => ({
    title: activity.title,
    summary: activity.summary,
    steps: activity.steps ?? [],
    materialsUsed: activity.materials_used ?? [],
    reflectionPrompts: activity.reflection_prompts ?? [],
    ageRange: activity.age_range ?? null,
    durationMinutes: activity.duration_minutes ?? null,
    energyLevel: activity.energy_level ?? null,
    groupSizeFit: activity.group_size_fit ?? null,
    // Drop any EYLF code the model returned that doesn't exist in our seeded
    // taxonomy, rather than trusting it blindly — wrong framework links are a
    // real compliance/trust risk if this is ever relied on for documentation.
    eylfCodes: (activity.eylf_codes ?? []).filter((code) => validCodes.has(code)),
    suggestedTemplate:
      activity.suggested_template && VALID_TEMPLATES.has(activity.suggested_template)
        ? (activity.suggested_template as "name_trace" | "drawing_frame" | "writing_lines")
        : null,
  }));

  return NextResponse.json({ activities: suggestions, mode: input.mode });
}
