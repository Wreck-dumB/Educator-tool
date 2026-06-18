import Link from "next/link";
import { getActivities } from "@/lib/supabase/activities";
import { getEylfOutcomes } from "@/lib/supabase/eylf";

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ outcome?: string; energy?: string }>;
}) {
  const { outcome, energy } = await searchParams;
  const [activities, outcomes] = await Promise.all([getActivities(), getEylfOutcomes()]);

  const filtered = activities.filter((a) => {
    if (outcome && !a.eylf_codes.includes(outcome)) return false;
    if (energy && a.energy_level !== energy) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Activity library</h1>
      <p className="mt-1 text-sm text-gray-500">Activities you&apos;ve saved from the generator.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/activities"
          className={`rounded-full border px-3 py-1 text-sm ${
            !outcome ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700"
          }`}
        >
          All outcomes
        </Link>
        {outcomes.map((o) => (
          <Link
            key={o.id}
            href={`/activities?outcome=${o.code}`}
            title={o.sub_outcome_text}
            className={`rounded-full border px-3 py-1 text-sm ${
              outcome === o.code
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-300 text-gray-700"
            }`}
          >
            {o.code}
          </Link>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {["calm", "moderate", "high"].map((level) => (
          <Link
            key={level}
            href={`/activities?energy=${level}${outcome ? `&outcome=${outcome}` : ""}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              energy === level
                ? "border-gray-900 bg-gray-100 text-gray-900"
                : "border-gray-300 text-gray-700"
            }`}
          >
            {level}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-500">No activities match yet.</p>
        )}
        {filtered.map((activity) => (
          <Link
            key={activity.id}
            href={`/activities/${activity.id}`}
            className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300"
          >
            <h2 className="font-semibold text-gray-900">{activity.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{activity.summary}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
              {activity.duration_minutes && <span>{activity.duration_minutes} min</span>}
              {activity.energy_level && <span>&middot; {activity.energy_level}</span>}
              {activity.eylf_codes.map((code) => (
                <span
                  key={code}
                  className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700"
                >
                  {code}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
