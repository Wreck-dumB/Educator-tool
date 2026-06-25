import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePolicy } from "@/lib/anthropic";
import { isRateLimited } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`policy:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You've hit the generation limit for now — try again in a bit." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const category = typeof body?.category === "string" ? body.category.trim().slice(0, 120) : "";
  const userInput = typeof body?.userInput === "string" ? body.userInput.trim().slice(0, 3000) : "";
  if (!category || !userInput) {
    return NextResponse.json({ error: "Category and description are required" }, { status: 400 });
  }

  let raw;
  try {
    raw = await generatePolicy(category, userInput);
  } catch (err) {
    console.error("Policy generation failed", err);
    return NextResponse.json({ error: "Failed to generate policy" }, { status: 502 });
  }

  return NextResponse.json({
    title: raw.title,
    purpose: raw.purpose ?? null,
    scope: raw.scope ?? null,
    procedureSteps: raw.procedure_steps ?? [],
    relatedLegislation: raw.related_legislation ?? [],
    suggestedAdditions: raw.suggested_additions ?? [],
  });
}
