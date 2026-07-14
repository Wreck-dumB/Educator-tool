import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateMealPlan, getMealPlanSlots } from "@/lib/supabase/mealPlans";
import { getRecipes } from "@/lib/supabase/recipes";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { cardClass } from "@/lib/ui";
import MealPlanGrid from "./MealPlanGrid";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Meal Planner · DR. SparkPlay" };

function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getWeekDates(mondayStr: string): string[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mondayStr + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function todayMonday(): string {
  return getMondayOf(new Date().toISOString().slice(0, 10));
}

export default async function MealPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/onboarding");

  const { week } = await searchParams;
  const weekStartDate = week ? getMondayOf(week) : todayMonday();
  const weekDates = getWeekDates(weekStartDate);

  const prevWeek = (() => {
    const d = new Date(weekStartDate + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 7);
    return d.toISOString().slice(0, 10);
  })();
  const nextWeek = (() => {
    const d = new Date(weekStartDate + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
  })();

  const [planId, recipes, { count: enrolledCount }] = await Promise.all([
    getOrCreateMealPlan(weekStartDate),
    getRecipes(),
    supabase
      .from("children")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", ownerUserId)
      .is("enrolment_ended_at", null),
  ]);

  if (!planId) redirect("/generate");

  const slots = await getMealPlanSlots(planId);

  const displayWeek = new Date(weekStartDate + "T00:00:00Z").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">Meal Planner</h1>
          <p className="mt-1 text-sm text-ink/60">
            Plan the week&apos;s meals from your saved recipes. AI fills empty slots taking all enrolled
            children&apos;s dietary needs into account. Then print the shopping list for the kitchen.
          </p>
        </div>
        <Link
          href="/recipes"
          className="shrink-0 rounded-full border border-coral-light px-4 py-1.5 text-sm font-medium text-coral-dark hover:bg-coral-light/50"
        >
          ← Recipes
        </Link>
      </div>

      {/* Week navigation */}
      <div className={`mt-6 flex items-center justify-between gap-3 p-4 ${cardClass}`}>
        <Link
          href={`/recipes/meal-planner?week=${prevWeek}`}
          className="rounded-full border border-coral-light px-4 py-1.5 text-sm font-medium text-ink/60 hover:bg-coral-light/50"
        >
          ← Prev
        </Link>
        <div className="text-center">
          <p className="font-display text-base font-semibold text-ink">Week of {displayWeek}</p>
          {(enrolledCount ?? 0) > 0 && (
            <p className="text-xs text-ink/40">{enrolledCount} children enrolled</p>
          )}
        </div>
        <Link
          href={`/recipes/meal-planner?week=${nextWeek}`}
          className="rounded-full border border-coral-light px-4 py-1.5 text-sm font-medium text-ink/60 hover:bg-coral-light/50"
        >
          Next →
        </Link>
      </div>

      {recipes.length === 0 && (
        <div className={`mt-4 p-4 ${cardClass} border-amber-dark/30 bg-amber-light/20`}>
          <p className="text-sm text-amber-dark">
            No saved recipes yet — AI fill will suggest custom meals, but{" "}
            <Link href="/recipes" className="font-medium underline">
              save some recipes first
            </Link>{" "}
            to get the most out of the planner.
          </p>
        </div>
      )}

      <div className={`mt-4 p-4 ${cardClass}`}>
        <MealPlanGrid
          planId={planId}
          weekStartDate={weekStartDate}
          weekDates={weekDates}
          slots={slots}
          recipes={recipes.map((r) => ({
            id: r.id,
            title: r.title,
            allergens_present: r.allergens_present,
          }))}
          enrolledCount={enrolledCount ?? 0}
        />
      </div>
    </div>
  );
}
