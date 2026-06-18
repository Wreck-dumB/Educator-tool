import Link from "next/link";
import { getObservations } from "@/lib/supabase/observations";
import { getChildren } from "@/lib/supabase/children";
import { getEylfOutcomes } from "@/lib/supabase/eylf";
import { logObservation } from "@/app/(app)/observations/actions";

export default async function ObservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; error?: string }>;
}) {
  const { child: childFilter, error } = await searchParams;
  const [observations, children, outcomes] = await Promise.all([
    getObservations(childFilter),
    getChildren(),
    getEylfOutcomes(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Observations</h1>
      <p className="mt-1 text-sm text-gray-500">
        Everything you&apos;ve logged, with EYLF outcomes tagged for documentation.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {children.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/observations"
            className={`rounded-full border px-3 py-1 text-sm ${
              !childFilter ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700"
            }`}
          >
            All children
          </Link>
          {children.map((c) => (
            <Link
              key={c.id}
              href={`/observations?child=${c.id}`}
              className={`rounded-full border px-3 py-1 text-sm ${
                childFilter === c.id
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-300 text-gray-700"
              }`}
            >
              {c.first_name}
            </Link>
          ))}
        </div>
      )}

      {children.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Log a new observation</h2>
          <form action={logObservation} className="mt-4 space-y-4">
            <input type="hidden" name="return_to" value="/observations" />
            <div>
              <label htmlFor="child_id" className="block text-sm font-medium text-gray-700">
                Child
              </label>
              <select
                id="child_id"
                name="child_id"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="note_text" className="block text-sm font-medium text-gray-700">
                Observation note
              </label>
              <textarea
                id="note_text"
                name="note_text"
                required
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">EYLF outcomes (optional)</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {outcomes.map((o) => (
                  <label key={o.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" name="eylf_codes" value={o.code} />
                    {o.code}
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Log observation
            </button>
          </form>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {observations.length === 0 && (
          <p className="text-sm text-gray-500">No observations logged yet.</p>
        )}
        {observations.map((o) => (
          <div key={o.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">{o.child_name}</p>
              <p className="text-xs text-gray-500">
                {new Date(o.observed_at).toLocaleDateString()}
              </p>
            </div>
            <p className="mt-1 text-sm text-gray-700">{o.note_text}</p>
            {o.activity_title && (
              <p className="mt-1 text-xs text-gray-500">From activity: {o.activity_title}</p>
            )}
            {o.eylf_codes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {o.eylf_codes.map((code) => (
                  <span
                    key={code}
                    className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                  >
                    EYLF {code}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
