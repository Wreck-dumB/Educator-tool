import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { isRateLimited } from "@/lib/rateLimit";
import { generateMealPlanAssignments } from "@/lib/anthropic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (isRateLimited(`meal-plan:${user.id}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Rate limited — 5 AI fills per hour" }, { status: 429 });
  }

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return NextResponse.json({ error: "No active service" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const { weekStartDate, emptySlots } = body ?? {};

  if (!weekStartDate || !Array.isArray(emptySlots) || emptySlots.length === 0) {
    return NextResponse.json({ error: "Missing weekStartDate or emptySlots" }, { status: 400 });
  }

  const [{ data: children }, { data: recipes }] = await Promise.all([
    supabase
      .from("children")
      .select("first_name, dietary_restrictions, medical_conditions, is_anaphylaxis_risk")
      .eq("owner_user_id", ownerUserId)
      .is("enrolment_ended_at", null),
    supabase
      .from("recipes")
      .select("id, title, dietary_tags, allergens_present, age_range")
      .eq("owner_user_id", ownerUserId),
  ]);

  const assignments = await generateMealPlanAssignments({
    weekStartDate,
    emptySlots,
    children: (children ?? []) as Parameters<typeof generateMealPlanAssignments>[0]["children"],
    recipes: (recipes ?? []) as Parameters<typeof generateMealPlanAssignments>[0]["recipes"],
  });

  return NextResponse.json({ assignments });
}
