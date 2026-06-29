"use client";

import { useState } from "react";
import type { RecipeSuggestion, Material, ChildProfile } from "@/lib/types/domain";
import { inputClass, primaryButtonClass, secondaryButtonClass, errorBannerClass } from "@/lib/ui";
import { saveRecipe } from "./actions";

export default function RecipeGeneratorForm({
  foodMaterials,
  childProfiles,
}: {
  foodMaterials: Material[];
  childProfiles: ChildProfile[];
}) {
  const [userInput, setUserInput] = useState("");
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [avoid, setAvoid] = useState("");
  const [servings, setServings] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [savedTitles, setSavedTitles] = useState<Set<string>>(new Set());

  function toggleIngredient(name: string) {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function fillAvoidFromChild(child: ChildProfile) {
    const parts = [child.medical_conditions, child.dietary_restrictions].filter(Boolean);
    if (child.is_anaphylaxis_risk) parts.push("anaphylaxis risk — check allergens carefully");
    setAvoid(parts.join("; "));
  }

  async function handleGenerate() {
    if (!userInput.trim()) {
      setError("Describe what you need first — e.g. morning tea for 10 toddlers.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      const res = await fetch("/api/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput,
          ingredientsOnHand: Array.from(selectedIngredients),
          avoid: avoid.trim() || undefined,
          servings: servings || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong");
      else setSuggestions(data.recipes);
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(recipe: RecipeSuggestion) {
    const result = await saveRecipe(userInput, recipe);
    if ("error" in result) setError(result.error);
    else setSavedTitles((prev) => new Set(prev).add(recipe.title));
  }

  return (
    <div className="rounded-2xl border border-coral-light bg-white p-5 shadow-sm">
      <label className="block text-sm font-medium text-ink/70">What do you need?</label>
      <textarea
        rows={3}
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="e.g. A simple morning tea for 10 toddlers, no cooking required, ready in 10 minutes"
        className={inputClass}
      />

      {foodMaterials.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-medium text-ink/70">Use what&apos;s on hand (optional)</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {foodMaterials.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleIngredient(m.name)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  selectedIngredients.has(m.name)
                    ? "border-coral bg-coral-light text-coral-dark"
                    : "border-coral-light/60 text-ink/70 hover:bg-coral-light/40"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
        <label className="block text-sm font-medium text-ink/70">Must avoid (allergies/dietary restrictions)</label>
        {childProfiles.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {childProfiles.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => fillAvoidFromChild(c)}
                className="rounded-full border border-sage px-3 py-1 text-xs text-sage-dark hover:bg-sage-light"
              >
                Fill from {c.first_name}
              </button>
            ))}
          </div>
        )}
        <textarea
          rows={2}
          value={avoid}
          onChange={(e) => setAvoid(e.target.value)}
          placeholder="e.g. no nuts, no dairy"
          className={inputClass}
        />
      </div>

      <div className="mt-3 max-w-[10rem]">
        <label className="block text-sm font-medium text-ink/70">Servings</label>
        <input
          type="number"
          min={1}
          value={servings}
          onChange={(e) => setServings(e.target.value ? Number(e.target.value) : "")}
          className={inputClass}
        />
      </div>

      {error && <p className={errorBannerClass}>{error}</p>}

      <button type="button" onClick={handleGenerate} disabled={loading} className={`mt-4 ${primaryButtonClass}`}>
        {loading ? "Cooking up ideas…" : "Generate recipes"}
      </button>

      {suggestions.length > 0 && (
        <div className="mt-4 space-y-4">
          {suggestions.map((recipe, idx) => (
            <div key={idx} className="rounded-xl border border-coral-light p-4">
              <h3 className="font-display text-lg font-semibold text-ink">{recipe.title}</h3>
              {recipe.description && <p className="mt-1 text-sm text-ink/70">{recipe.description}</p>}
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink/50">
                {recipe.prepTimeMinutes && <span>⏱ {recipe.prepTimeMinutes} min</span>}
                {recipe.servings && <span>🍽 {recipe.servings} servings</span>}
                {recipe.ageRange && <span>👶 {recipe.ageRange}</span>}
              </div>

              {recipe.allergensPresent.length > 0 && (
                <p className="mt-2 rounded-lg bg-coral-light px-2 py-1 text-xs text-coral-dark">
                  Contains: {recipe.allergensPresent.join(", ")}
                </p>
              )}
              {recipe.chokingHazardNotes && (
                <p className="mt-2 rounded-lg bg-amber-light px-2 py-1 text-xs text-amber-dark">
                  ⚠ {recipe.chokingHazardNotes}
                </p>
              )}

              <p className="mt-3 text-sm font-medium text-ink/80">Ingredients</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink/80">
                {recipe.ingredients.map((i, i2) => (
                  <li key={i2}>{i}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm font-medium text-ink/80">Steps</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-ink/80">
                {recipe.steps.map((s, i2) => (
                  <li key={i2}>{s}</li>
                ))}
              </ol>

              <button
                type="button"
                onClick={() => handleSave(recipe)}
                disabled={savedTitles.has(recipe.title)}
                className={`mt-3 ${savedTitles.has(recipe.title) ? secondaryButtonClass : primaryButtonClass}`}
              >
                {savedTitles.has(recipe.title) ? "Saved" : "Save recipe"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
