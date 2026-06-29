import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRecipes } from "@/lib/anthropic";
import { isRateLimited } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isRateLimited(`recipe:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You've hit the generation limit for now — try again in a bit." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const userInput = typeof body?.userInput === "string" ? body.userInput.trim().slice(0, 2000) : "";
  const ingredientsOnHand = Array.isArray(body?.ingredientsOnHand)
    ? body.ingredientsOnHand.filter((i: unknown) => typeof i === "string").slice(0, 50)
    : undefined;
  const avoid = typeof body?.avoid === "string" ? body.avoid.trim().slice(0, 500) : undefined;
  const servings = typeof body?.servings === "number" && body.servings > 0 ? Math.min(body.servings, 200) : undefined;

  if (!userInput) {
    return NextResponse.json({ error: "Describe what you need first" }, { status: 400 });
  }

  let raw;
  try {
    raw = await generateRecipes(userInput, ingredientsOnHand, avoid, servings);
  } catch (err) {
    console.error("Recipe generation failed", err);
    return NextResponse.json({ error: "Failed to generate recipes" }, { status: 502 });
  }

  return NextResponse.json({
    recipes: raw.map((r) => ({
      title: r.title,
      description: r.description ?? null,
      ingredients: r.ingredients ?? [],
      steps: r.steps ?? [],
      prepTimeMinutes: r.prep_time_minutes ?? null,
      servings: r.servings ?? null,
      ageRange: r.age_range ?? null,
      dietaryTags: r.dietary_tags ?? [],
      allergensPresent: r.allergens_present ?? [],
      chokingHazardNotes: r.choking_hazard_notes ?? null,
    })),
  });
}
