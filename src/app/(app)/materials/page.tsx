import { getMaterials } from "@/lib/supabase/materials";
import { addMaterial, deleteMaterial } from "@/app/(app)/materials/actions";
import { getMaterialIcon } from "@/lib/icons";
import { inputClass, cardClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const materials = await getMaterials();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Materials on hand</h1>
      <p className="mt-1 text-sm text-ink/60">
        Save what you commonly have around so you don&apos;t have to retype it every time you
        generate an activity.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      <div className={`mt-6 ${cardClass}`}>
        <div className="border-b border-coral-light px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">Saved materials</h2>
        </div>
        {materials.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink/50">No materials saved yet.</p>
        ) : (
          <ul className="divide-y divide-coral-light">
            {materials.map((material) => (
              <li key={material.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-ink">
                  {getMaterialIcon(material.name)} {material.name}
                </span>
                <form action={deleteMaterial}>
                  <input type="hidden" name="id" value={material.id} />
                  <button type="submit" className="text-sm font-medium text-coral-dark hover:underline">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={`mt-6 p-4 ${cardClass}`}>
        <form action={addMaterial} className="flex gap-3">
          <input
            name="name"
            type="text"
            required
            placeholder="e.g. cardboard boxes, paint, blocks"
            className={`${inputClass} mt-0`}
          />
          <button type="submit" className={`shrink-0 ${primaryButtonClass}`}>
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
