import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFormTemplate } from "@/lib/anthropic";
import { isRateLimited } from "@/lib/rateLimit";
import { checkAndConsumeCredit, creditErrorResponse } from "@/lib/credits";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (await isRateLimited(`form-template:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You've hit the generation limit for now — try again in a bit." },
      { status: 429 },
    );
  }

  const credit = await checkAndConsumeCredit("form-template");
  if (!credit.ok) {
    return NextResponse.json(creditErrorResponse(credit.reason), { status: credit.reason === "out_of_credits" ? 402 : 403 });
  }

  const body = await request.json().catch(() => null);
  const category = typeof body?.category === "string" ? body.category.trim().slice(0, 120) : "";
  const userInput = typeof body?.userInput === "string" ? body.userInput.trim().slice(0, 3000) : "";
  if (!category || !userInput) {
    return NextResponse.json({ error: "Category and description are required" }, { status: 400 });
  }

  let raw;
  try {
    raw = await generateFormTemplate(category, userInput);
  } catch (err) {
    console.error("Form template generation failed", err);
    return NextResponse.json({ error: "Failed to generate form template" }, { status: 502 });
  }

  return NextResponse.json({
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : `${category} Form`,
    purpose: raw.purpose ?? null,
    fieldsToComplete: Array.isArray(raw.fields_to_complete) ? raw.fields_to_complete : [],
    bodyText: raw.body_text ?? null,
    requiresSignature: raw.requires_signature ?? false,
    suggestedAdditions: Array.isArray(raw.suggested_additions) ? raw.suggested_additions : [],
  });
}
