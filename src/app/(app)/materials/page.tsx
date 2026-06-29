import { getMaterials } from "@/lib/supabase/materials";
import { addMaterial, deleteMaterial, updateMaterialStock } from "@/app/(app)/materials/actions";
import { getMaterialIcon } from "@/lib/icons";
import { inputClass, cardClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import type { Material } from "@/lib/types/domain";

function isLowStock(m: Material) {
  return m.quantity !== null && m.low_stock_threshold !== null && m.quantity <= m.low_stock_threshold;
}

function MaterialRow({ material }: { material: Material }) {
  const low = isLowStock(material);
  return (
    <li className={`px-4 py-3 ${low ? "bg-amber-light/40" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-ink">
          {getMaterialIcon(material.name)} {material.name}
          {material.quantity !== null && (
            <span className="ml-2 text-sm text-ink/50">
              {material.quantity} {material.unit ?? ""}
            </span>
          )}
          {low && (
            <span className="ml-2 rounded-full bg-amber-light px-2 py-0.5 text-xs font-medium text-amber-dark">
              Low stock
            </span>
          )}
        </span>
        <form action={deleteMaterial}>
          <input type="hidden" name="id" value={material.id} />
          <button type="submit" className="text-sm font-medium text-coral-dark hover:underline">
            Remove
          </button>
        </form>
      </div>
      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-ink/40">Update stock</summary>
        <form action={updateMaterialStock} className="mt-2 flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={material.id} />
          <div>
            <label className="block text-xs text-ink/50">Quantity</label>
            <input
              name="quantity"
              type="number"
              step="any"
              defaultValue={material.quantity ?? ""}
              className={`${inputClass} mt-0.5 w-24`}
            />
          </div>
          <div>
            <label className="block text-xs text-ink/50">Unit</label>
            <input name="unit" type="text" defaultValue={material.unit ?? ""} placeholder="rolls, boxes…" className={`${inputClass} mt-0.5 w-28`} />
          </div>
          <div>
            <label className="block text-xs text-ink/50">Low-stock at</label>
            <input
              name="low_stock_threshold"
              type="number"
              step="any"
              defaultValue={material.low_stock_threshold ?? ""}
              className={`${inputClass} mt-0.5 w-24`}
            />
          </div>
          <button type="submit" className="rounded-full border border-coral-light px-3 py-2 text-xs font-medium text-coral-dark hover:bg-coral-light/40">
            Save
          </button>
        </form>
      </details>
    </li>
  );
}

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const materials = await getMaterials();
  const classroomMaterials = materials.filter((m) => m.category === "classroom");
  const foodMaterials = materials.filter((m) => m.category === "food");
  const lowStockCount = materials.filter(isLowStock).length;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Materials &amp; pantry</h1>
      <p className="mt-1 text-sm text-ink/60">
        Save what you commonly have around so you don&apos;t have to retype it every time you
        generate an activity or recipe. Set a quantity and a low-stock level on anything you want to
        track, and it&apos;ll flag here when it runs low — this is an in-app indicator only, not an
        email or push alert.
      </p>
      {lowStockCount > 0 && (
        <p className="mt-3 rounded-xl bg-amber-light px-3 py-2 text-sm text-amber-dark">
          ⚠ {lowStockCount} item{lowStockCount === 1 ? "" : "s"} running low.
        </p>
      )}

      {error && <p className={errorBannerClass}>{error}</p>}

      <div className={`mt-6 ${cardClass}`}>
        <div className="border-b border-coral-light px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">Classroom materials</h2>
        </div>
        {classroomMaterials.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink/50">No classroom materials saved yet.</p>
        ) : (
          <ul className="divide-y divide-coral-light">
            {classroomMaterials.map((m) => (
              <MaterialRow key={m.id} material={m} />
            ))}
          </ul>
        )}
      </div>

      <div className={`mt-6 ${cardClass}`}>
        <div className="border-b border-coral-light px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">Food &amp; pantry</h2>
        </div>
        {foodMaterials.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink/50">No pantry items saved yet.</p>
        ) : (
          <ul className="divide-y divide-coral-light">
            {foodMaterials.map((m) => (
              <MaterialRow key={m.id} material={m} />
            ))}
          </ul>
        )}
      </div>

      <div className={`mt-6 p-4 ${cardClass}`}>
        <h2 className="font-display text-sm font-semibold text-ink">Add an item</h2>
        <form action={addMaterial} className="mt-3 space-y-3">
          <div className="flex gap-3">
            <input name="name" type="text" required placeholder="e.g. paint, rolled oats" className={`${inputClass} mt-0 flex-1`} />
            <select name="category" defaultValue="classroom" className={`${inputClass} mt-0 w-40`}>
              <option value="classroom">Classroom</option>
              <option value="food">Food/pantry</option>
            </select>
          </div>
          <div className="flex gap-3">
            <input name="quantity" type="number" step="any" placeholder="Quantity (optional)" className={`${inputClass} mt-0`} />
            <input name="unit" type="text" placeholder="Unit (optional)" className={`${inputClass} mt-0`} />
            <input name="low_stock_threshold" type="number" step="any" placeholder="Low-stock at (optional)" className={`${inputClass} mt-0`} />
          </div>
          <button type="submit" className={primaryButtonClass}>
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
