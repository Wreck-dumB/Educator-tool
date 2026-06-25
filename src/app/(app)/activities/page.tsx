import Link from "next/link";
import { getActivities } from "@/lib/supabase/activities";
import { getEylfOutcomes } from "@/lib/supabase/eylf";
import { getEnergyIcon } from "@/lib/icons";

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
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Activity library</h1>
      <p className="mt-1 text-sm text-ink/60">Activities you&apos;ve saved from the generator.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/activities"
          className={`rounded-full border px-3 py-1 text-sm ${
            !outcome ? "border-coral bg-coral-light text-coral-dark" : "border-coral-light/60 text-ink/70"
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
                ? "border-coral bg-coral-light text-coral-dark"
                : "border-coral-light/60 text-ink/70"
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
                ? "border-sage bg-sage-light text-sage-dark"
                : "border-coral-light/60 text-ink/70"
            }`}
          >
            {getEnergyIcon(level)} {level}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {filtered.length === 0 && (
          <p className="text-sm text-ink/50">No activities match yet.</p>
        )}
        {filtered.map((activity) => (
          <Link
            key={activity.id}
            href={`/activities/${activity.id}`}
            className="block rounded-2xl border border-coral-light bg-white p-4 shadow-sm transition-colors hover:border-coral"
          >
            <h2 className="font-display font-semibold text-ink">{activity.title}</h2>
            <p className="mt-1 text-sm text-ink/70">{activity.summary}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink/50">
              {activity.energy_level && (
                <span className="text-base" title={activity.energy_level}>
                  {getEnergyIcon(activity.energy_level)}
                </span>
              )}
              {activity.duration_minutes && <span>{activity.duration_minutes} min</span>}
              {activity.eylf_codes.map((code) => (
                <span
                  key={code}
                  className="rounded-full bg-sage-light px-2 py-0.5 font-medium text-sage-dark"
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
