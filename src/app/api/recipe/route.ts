import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRecipes } from "@/lib/anthropic";
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

  if (await isRateLimited(`recipe:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You've hit the generation limit for now — try again in a bit." },
      { status: 429 },
    );
  }

  const credit = await checkAndConsumeCredit("recipe");
  if (!credit.ok) {
    return NextResponse.json(creditErrorResponse(credit.reason), { status: credit.reason === "out_of_credits" ? 402 : 403 });
  }

  const body = await request.json().catch(() => null);
  const userInput = typeof body?.userInput === "string" ? body.userInput.trim().slice(0, 2000) : "";
  const ingredientsOnHand = Array.isArray(body?.ingredientsOnHand)
    ? body.ingredientsOnHand.filter((i: unknown) => typeof i === "string").slice(0, 50)
    : undefined;
  const avoid = typeof body?.avoid === "string" ? body.avoid.trim().slice(0, 500) : undefined;
  const servings = typeof body?.servings === "number" && body.servings > 0 ? Math.min(body.servings, 200) : undefined;
  const count =
    typeof body?.count === "number" && body.count >= 1
      ? Math.min(Math.round(body.count), 10)
      : 5;

  if (!userInput) {
    return NextResponse.json({ error: "Describe what you need first" }, { status: 400 });
  }

  let raw;
  try {
    raw = await generateRecipes(userInput, ingredientsOnHand, avoid, servings, count);
  } catch (err) {
    console.error("Recipe generation failed", err);
    return NextResponse.json({ error: "Failed to generate recipes" }, { status: 502 });
  }

  return NextResponse.json({
    recipes: raw.map((r) => ({
      title: r.title,
      description: r.description ?? null,
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      steps: Array.isArray(r.steps) ? r.steps : [],
      prepTimeMinutes: r.prep_time_minutes ?? null,
      servings: r.servings ?? null,
      ageRange: r.age_range ?? null,
      dietaryTags: Array.isArray(r.dietary_tags) ? r.dietary_tags : [],
      allergensPresent: Array.isArray(r.allergens_present) ? r.allergens_present : [],
      chokingHazardNotes: r.choking_hazard_notes ?? null,
    })),
  });
}
