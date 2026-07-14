"use client";

import { useState, useTransition } from "react";
import type { MealPlanSlotWithRecipe } from "@/lib/supabase/mealPlans";
import { upsertMealPlanSlot, deleteMealPlanSlot, batchUpsertMealPlanSlots } from "./actions";
import { primaryButtonClass, errorBannerClass } from "@/lib/ui";

const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast" },
  { key: "morning_tea", label: "Morning tea" },
  { key: "lunch", label: "Lunch" },
  { key: "afternoon_tea", label: "Afternoon tea" },
  { key: "late_snack", label: "Late snack" },
] as const;

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

interface Recipe {
  id: string;
  title: string;
  allergens_present: string[];
}

interface Props {
  planId: string;
  weekStartDate: string;
  weekDates: string[];
  slots: MealPlanSlotWithRecipe[];
  recipes: Recipe[];
  enrolledCount: number;
}

type SlotMap = Map<string, MealPlanSlotWithRecipe>;

function slotKey(date: string, mealType: string) {
  return `${date}:${mealType}`;
}

export default function MealPlanGrid({ planId, weekStartDate, weekDates, slots, recipes, enrolledCount }: Props) {
  const [slotMap, setSlotMap] = useState<SlotMap>(() => {
    const m = new Map<string, MealPlanSlotWithRecipe>();
    for (const s of slots) m.set(slotKey(s.slot_date, s.meal_type), s);
    return m;
  });
  const [showShopping, setShowShopping] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function getSlot(date: string, mealType: string) {
    return slotMap.get(slotKey(date, mealType)) ?? null;
  }

  function setSlotOptimistic(slot: MealPlanSlotWithRecipe) {
    setSlotMap((prev) => new Map(prev).set(slotKey(slot.slot_date, slot.meal_type), slot));
  }

  function clearSlotOptimistic(date: string, mealType: string) {
    setSlotMap((prev) => {
      const next = new Map(prev);
      next.delete(slotKey(date, mealType));
      return next;
    });
  }

  function handleRecipeChange(date: string, mealType: string, recipeId: string) {
    const recipe = recipes.find((r) => r.id === recipeId) ?? null;
    const fd = new FormData();
    fd.set("plan_id", planId);
    fd.set("slot_date", date);
    fd.set("meal_type", mealType);
    fd.set("recipe_id", recipeId);
    if (recipe) {
      setSlotOptimistic({
        id: "",
        plan_id: planId,
        slot_date: date,
        meal_type: mealType,
        recipe_id: recipeId,
        custom_title: null,
        recipe_title: recipe.title,
        recipe_ingredients: [],
        recipe_allergens: recipe.allergens_present,
      });
    }
    startTransition(() => { upsertMealPlanSlot(fd); });
  }

  function handleClear(date: string, mealType: string, slotId: string) {
    clearSlotOptimistic(date, mealType);
    const fd = new FormData();
    fd.set("id", slotId);
    startTransition(() => { deleteMealPlanSlot(fd); });
  }

  async function handleAiFill() {
    setError(null);
    setAiLoading(true);
    const emptySlots: { slot_date: string; meal_type: string }[] = [];
    for (const date of weekDates) {
      for (const { key } of MEAL_TYPES) {
        if (!getSlot(date, key)) emptySlots.push({ slot_date: date, meal_type: key });
      }
    }
    if (emptySlots.length === 0) {
      setAiLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/meal-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStartDate, emptySlots }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "AI fill failed");
        return;
      }
      const assignments: { slot_date: string; meal_type: string; recipe_id: string | null; custom_title: string | null }[] =
        data.assignments ?? [];

      // Optimistic update
      for (const a of assignments) {
        const recipe = a.recipe_id ? recipes.find((r) => r.id === a.recipe_id) : null;
        setSlotOptimistic({
          id: "",
          plan_id: planId,
          slot_date: a.slot_date,
          meal_type: a.meal_type,
          recipe_id: a.recipe_id,
          custom_title: a.custom_title,
          recipe_title: recipe?.title ?? a.custom_title,
          recipe_ingredients: [],
          recipe_allergens: recipe?.allergens_present ?? [],
        });
      }

      // Persist
      startTransition(() => {
        batchUpsertMealPlanSlots(
          planId,
          assignments.map((a) => ({
            slotDate: a.slot_date,
            mealType: a.meal_type,
            recipeId: a.recipe_id,
            customTitle: a.custom_title,
          })),
        );
      });
    } catch {
      setError("Could not reach the server");
    } finally {
      setAiLoading(false);
    }
  }

  // Compute shopping list grouped by day → slot → ingredients
  const shoppingByDay = weekDates.map((date, i) => {
    const daySlots = MEAL_TYPES.map(({ key, label }) => {
      const slot = getSlot(date, key);
      return slot ? { mealLabel: label, title: slot.recipe_title ?? slot.custom_title ?? "", ingredients: slot.recipe_ingredients } : null;
    }).filter(Boolean) as { mealLabel: string; title: string; ingredients: string[] }[];
    return { date, dayLabel: DAY_LABELS[i], slots: daySlots };
  }).filter((d) => d.slots.length > 0);

  const emptyCount = weekDates.reduce((sum, date) => {
    return sum + MEAL_TYPES.filter(({ key }) => !getSlot(date, key)).length;
  }, 0);

  if (showShopping) {
    return (
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-xl font-semibold text-ink">Shopping list</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-full border border-coral-light px-4 py-1.5 text-sm font-medium text-ink/60 hover:bg-coral-light/50"
            >
              Print
            </button>
            <button
              type="button"
              onClick={() => setShowShopping(false)}
              className="rounded-full border border-coral-light px-4 py-1.5 text-sm font-medium text-coral-dark hover:bg-coral-light/50"
            >
              ← Back to grid
            </button>
          </div>
        </div>
        {enrolledCount > 0 && (
          <p className="mb-4 text-sm text-ink/50">{enrolledCount} enrolled children this week.</p>
        )}
        {shoppingByDay.length === 0 ? (
          <p className="text-sm text-ink/50">No meals planned yet — fill the grid first.</p>
        ) : (
          <div className="space-y-6">
            {shoppingByDay.map(({ date, dayLabel, slots: daySlots }) => (
              <div key={date}>
                <h3 className="font-display text-base font-semibold text-coral-dark border-b border-coral-light pb-1 mb-2">
                  {dayLabel} — {new Date(date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </h3>
                <div className="space-y-3">
                  {daySlots.map(({ mealLabel, title, ingredients }) => (
                    <div key={mealLabel}>
                      <p className="text-sm font-semibold text-ink">{mealLabel}: {title}</p>
                      {ingredients.length > 0 ? (
                        <ul className="mt-1 pl-4 space-y-0.5">
                          {ingredients.map((ing, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-ink/70">
                              <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded border border-ink/20 print:border-black" />
                              {ing}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-0.5 pl-4 text-xs text-ink/40 italic">No ingredient list — custom or unsaved recipe</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {error && <p className={errorBannerClass}>{error}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleAiFill}
          disabled={aiLoading || emptyCount === 0}
          className={`${primaryButtonClass} ${emptyCount === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          {aiLoading ? "Filling…" : `AI fill${emptyCount > 0 ? ` (${emptyCount} empty)` : " (all filled)"}`}
        </button>
        <button
          type="button"
          onClick={() => setShowShopping(true)}
          className="rounded-full border border-coral-light px-4 py-2 text-sm font-medium text-ink/70 hover:bg-coral-light/50"
        >
          Shopping list →
        </button>
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto rounded-2xl border border-coral-light">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-coral-light/40">
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-widest text-ink/50 w-32">Meal</th>
              {weekDates.map((date, i) => (
                <th key={date} className="px-3 py-2 text-left text-xs font-semibold text-ink">
                  {DAY_LABELS[i]}{" "}
                  <span className="font-normal text-ink/40">
                    {new Date(date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEAL_TYPES.map(({ key, label }) => (
              <tr key={key} className="border-t border-coral-light/50 hover:bg-coral-light/10">
                <td className="px-3 py-2 text-xs font-semibold text-ink/60 whitespace-nowrap">{label}</td>
                {weekDates.map((date) => {
                  const slot = getSlot(date, key);
                  return (
                    <td key={date} className="px-2 py-1.5 align-top">
                      {slot ? (
                        <div className="flex items-start gap-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-ink truncate">
                              {slot.recipe_title ?? slot.custom_title ?? "—"}
                            </p>
                            {slot.recipe_allergens.length > 0 && (
                              <p className="text-[10px] text-coral-dark truncate">
                                {slot.recipe_allergens.join(", ")}
                              </p>
                            )}
                          </div>
                          {slot.id && (
                            <button
                              type="button"
                              onClick={() => handleClear(date, key, slot.id)}
                              className="shrink-0 text-[10px] text-ink/30 hover:text-coral-dark leading-none mt-0.5"
                              title="Clear"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ) : (
                        <select
                          defaultValue=""
                          onChange={(e) => { if (e.target.value) handleRecipeChange(date, key, e.target.value); }}
                          className="w-full rounded-lg border border-coral-light/60 bg-white px-1.5 py-1 text-xs text-ink/50 focus:border-coral focus:outline-none"
                        >
                          <option value="" disabled>Pick recipe…</option>
                          {recipes.map((r) => (
                            <option key={r.id} value={r.id}>{r.title}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink/40">
        Select from your saved recipes, or use &ldquo;AI fill&rdquo; to auto-plan empty slots taking all enrolled children&apos;s dietary needs into account.
      </p>
    </div>
  );
}
