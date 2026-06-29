import { getRecipes } from "@/lib/supabase/recipes";
import { getMaterials } from "@/lib/supabase/materials";
import { getChildren } from "@/lib/supabase/children";
import { cardClass } from "@/lib/ui";
import RecipeGeneratorForm from "./RecipeGeneratorForm";
import { deleteRecipe } from "./actions";

export default async function RecipesPage() {
  const [recipes, materials, children] = await Promise.all([getRecipes(), getMaterials(), getChildren()]);
  const foodMaterials = materials.filter((m) => m.category === "food");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Recipes</h1>
      <p className="mt-1 text-sm text-ink/60">
        Generate child-friendly recipes for snacks, meals, or cooking activities. Allergens and
        choking-hazard notes are always shown — but this is a draft for your own judgement, always
        check it against each child&apos;s actual enrolment/allergy record before serving.
      </p>

      <div className="mt-6">
        <RecipeGeneratorForm foodMaterials={foodMaterials} childProfiles={children} />
      </div>

      <div className="mt-6 space-y-3">
        {recipes.length === 0 && <p className="text-sm text-ink/50">No recipes saved yet.</p>}
        {recipes.map((r) => (
          <div key={r.id} className={`p-4 ${cardClass}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display font-semibold text-ink">{r.title}</h2>
                {r.description && <p className="mt-1 text-sm text-ink/70">{r.description}</p>}
                {r.allergens_present.length > 0 && (
                  <p className="mt-1 text-xs text-coral-dark">Contains: {r.allergens_present.join(", ")}</p>
                )}
                {r.choking_hazard_notes && <p className="mt-1 text-xs text-amber-dark">⚠ {r.choking_hazard_notes}</p>}
              </div>
              <form action={deleteRecipe}>
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" className="shrink-0 text-xs text-coral-dark hover:underline">
                  Remove
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
