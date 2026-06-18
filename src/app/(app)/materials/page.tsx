import { getMaterials } from "@/lib/supabase/materials";
import { addMaterial, deleteMaterial } from "@/app/(app)/materials/actions";

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const materials = await getMaterials();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Materials on hand</h1>
      <p className="mt-1 text-sm text-gray-500">
        Save what you commonly have around so you don&apos;t have to retype it every time you
        generate an activity.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Saved materials</h2>
        </div>
        {materials.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">No materials saved yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {materials.map((material) => (
              <li
                key={material.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-gray-900">{material.name}</span>
                <form action={deleteMaterial}>
                  <input type="hidden" name="id" value={material.id} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <form action={addMaterial} className="flex gap-3">
          <input
            name="name"
            type="text"
            required
            placeholder="e.g. cardboard boxes, paint, blocks"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
