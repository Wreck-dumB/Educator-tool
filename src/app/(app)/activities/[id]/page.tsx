import { notFound } from "next/navigation";
import { getActivity } from "@/lib/supabase/activities";
import { getChildren } from "@/lib/supabase/children";
import { getObservations } from "@/lib/supabase/observations";
import { logObservation } from "@/app/(app)/observations/actions";

export default async function ActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const activity = await getActivity(id);
  if (!activity) notFound();

  const [children, allObservations] = await Promise.all([getChildren(), getObservations()]);
  const observations = allObservations.filter((o) => o.activity_id === activity.id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">{activity.title}</h1>
      <p className="mt-2 text-gray-600">{activity.summary}</p>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
        {activity.duration_minutes && <span>{activity.duration_minutes} min</span>}
        {activity.energy_level && <span>&middot; {activity.energy_level}</span>}
        {activity.group_size_fit && <span>&middot; {activity.group_size_fit.replace("_", " ")}</span>}
        {activity.age_range && <span>&middot; {activity.age_range}</span>}
      </div>

      {activity.eylf_codes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activity.eylf_codes.map((code) => (
            <span
              key={code}
              className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
            >
              EYLF {code}
            </span>
          ))}
        </div>
      )}

      {activity.steps.length > 0 && (
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-gray-700">
          {activity.steps.map((step, idx) => (
            <li key={idx}>{step}</li>
          ))}
        </ol>
      )}

      {activity.materials_used.length > 0 && (
        <p className="mt-3 text-sm text-gray-600">
          <span className="font-medium">Materials:</span> {activity.materials_used.join(", ")}
        </p>
      )}

      {activity.reflection_prompts.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-700">Reflection prompts</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-600">
            {activity.reflection_prompts.map((p, idx) => (
              <li key={idx}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Log an observation</h2>
        {children.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            Add a child profile first to log an observation against this activity.
          </p>
        ) : (
          <form action={logObservation} className="mt-4 space-y-4">
            <input type="hidden" name="activity_id" value={activity.id} />
            <input type="hidden" name="return_to" value={`/activities/${activity.id}`} />
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
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {activity.eylf_codes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700">EYLF outcomes</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {activity.eylf_codes.map((code) => (
                    <label key={code} className="flex items-center gap-1.5 text-sm text-gray-700">
                      <input type="checkbox" name="eylf_codes" value={code} defaultChecked />
                      {code}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Log observation
            </button>
          </form>
        )}
      </div>

      {observations.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Past observations from this activity</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {observations.map((o) => (
              <li key={o.id} className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{o.child_name}</p>
                <p className="mt-0.5 text-sm text-gray-600">{o.note_text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
