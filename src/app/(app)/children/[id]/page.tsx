import { notFound } from "next/navigation";
import { getChild } from "@/lib/supabase/children";
import { updateChild, deleteChild } from "@/app/(app)/children/actions";
import { getObservations } from "@/lib/supabase/observations";

export default async function ChildDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const child = await getChild(id);

  if (!child) notFound();

  const observations = await getObservations(id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">{child.first_name}</h1>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <form action={updateChild} className="space-y-4">
          <input type="hidden" name="id" value={child.id} />
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
              First name
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              required
              defaultValue={child.first_name}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">
              Date of birth
            </label>
            <input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              defaultValue={child.date_of_birth ?? ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="current_interests"
              className="block text-sm font-medium text-gray-700"
            >
              Current interests
            </label>
            <input
              id="current_interests"
              name="current_interests"
              type="text"
              defaultValue={child.current_interests ?? ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Save changes
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Observations</h2>
        </div>
        {observations.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">
            Logged observations for {child.first_name} will appear here once you start saving
            them from generated activities.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {observations.map((o) => (
              <li key={o.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">{o.note_text}</p>
                  <p className="ml-3 shrink-0 text-xs text-gray-500">
                    {new Date(o.observed_at).toLocaleDateString()}
                  </p>
                </div>
                {o.eylf_codes.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {o.eylf_codes.map((code) => (
                      <span
                        key={code}
                        className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={deleteChild} className="mt-6">
        <input type="hidden" name="id" value={child.id} />
        <button
          type="submit"
          className="text-sm font-medium text-red-600 hover:text-red-700"
        >
          Delete this child profile
        </button>
      </form>
    </div>
  );
}
