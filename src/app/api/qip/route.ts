import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateQipItems } from "@/lib/anthropic";
import { getNqsStandards } from "@/lib/supabase/qip";
import { isRateLimited } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`qip:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You've hit the generation limit for now — try again in a bit." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const userInput = typeof body?.userInput === "string" ? body.userInput.trim().slice(0, 3000) : "";
  const targetQualityAreas = Array.isArray(body?.targetQualityAreas)
    ? body.targetQualityAreas.filter((n: unknown) => typeof n === "number" && n >= 1 && n <= 7)
    : undefined;

  if (!userInput) {
    return NextResponse.json({ error: "Describe current practice, strengths, or known issues first" }, { status: 400 });
  }

  const standards = await getNqsStandards();
  if (standards.length === 0) {
    return NextResponse.json({ error: "NQS standard data is not seeded" }, { status: 500 });
  }
  const validCodes = new Set(standards.map((s) => s.code));

  let raw;
  try {
    raw = await generateQipItems(standards, userInput, targetQualityAreas);
  } catch (err) {
    console.error("QIP item generation failed", err);
    return NextResponse.json({ error: "Failed to generate QIP items" }, { status: 502 });
  }

  // Guardrail: never trust the model's own standard_code -- drop it rather
  // than save a reference to a standard that doesn't exist, same pattern as
  // EYLF code validation for generated activities.
  const items = raw
    .filter((item) => item.quality_area_number >= 1 && item.quality_area_number <= 7 && item.description?.trim())
    .map((item) => ({
      qualityAreaNumber: item.quality_area_number,
      standardCode: item.standard_code && validCodes.has(item.standard_code) ? item.standard_code : null,
      itemType: item.item_type,
      description: item.description,
      priority: item.item_type === "improvement" ? item.priority ?? null : null,
      successMeasure: item.item_type === "improvement" ? item.success_measure ?? null : null,
      steps: item.item_type === "improvement" ? item.steps ?? [] : [],
      timeframe: item.item_type === "improvement" ? item.timeframe ?? null : null,
    }));

  return NextResponse.json({ items });
}
