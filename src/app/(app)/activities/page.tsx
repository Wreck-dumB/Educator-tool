import Link from "next/link";
import { getActivities } from "@/lib/supabase/activities";
import { getEylfOutcomes } from "@/lib/supabase/eylf";
import { getEnergyIcon } from "@/lib/icons";
import { archiveActivity, unarchiveActivity, deleteActivity } from "./actions";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "az", label: "A–Z" },
];

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ outcome?: string; energy?: string; sort?: string; archived?: string }>;
}) {
  const { outcome, energy, sort = "newest", archived } = await searchParams;
  const showArchived = archived === "1";

  const [activities, outcomes] = await Promise.all([getActivities(), getEylfOutcomes()]);

  const filtered = activities.filter((a) => {
    if (a.is_archived !== showArchived) return false;
    if (outcome && !a.eylf_codes.includes(outcome)) return false;
    if (energy && a.energy_level !== energy) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "az") return a.title.localeCompare(b.title);
    if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const archivedCount = activities.filter((a) => a.is_archived).length;

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { outcome, energy, sort, archived, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/activities?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">Activity library</h1>
          <p className="mt-1 text-sm text-ink/60">Activities you&apos;ve saved from the generator.</p>
        </div>
        {archivedCount > 0 && (
          <Link
            href={showArchived ? buildUrl({ archived: undefined }) : buildUrl({ archived: "1" })}
            className="mt-1 shrink-0 rounded-full border border-ink/20 px-3 py-1.5 text-sm text-ink/50 hover:text-ink/70"
          >
            {showArchived ? "← Active" : `Archived (${archivedCount})`}
          </Link>
        )}
      </div>

      {/* Sort */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-ink/40">Sort</span>
        {SORT_OPTIONS.map((o) => (
          <Link
            key={o.value}
            href={buildUrl({ sort: o.value })}
            className={`rounded-full border px-3 py-1 text-sm ${
              sort === o.value
                ? "border-coral bg-coral-light text-coral-dark"
                : "border-coral-light/60 text-ink/70"
            }`}
          >
            {o.label}
          </Link>
        ))}
      </div>

      {/* EYLF outcome filter */}
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href={buildUrl({ outcome: undefined })}
          className={`rounded-full border px-3 py-1 text-sm ${
            !outcome ? "border-coral bg-coral-light text-coral-dark" : "border-coral-light/60 text-ink/70"
          }`}
        >
          All outcomes
        </Link>
        {outcomes.map((o) => (
          <Link
            key={o.id}
            href={buildUrl({ outcome: o.code })}
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

      {/* Energy filter */}
      <div className="mt-2 flex flex-wrap gap-2">
        {["calm", "moderate", "high"].map((level) => (
          <Link
            key={level}
            href={buildUrl({ energy: energy === level ? undefined : level })}
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
        {sorted.length === 0 && (
          <p className="text-sm text-ink/50">
            {showArchived ? "No archived activities." : "No activities match yet."}
          </p>
        )}
        {sorted.map((activity) => (
          <div key={activity.id} className="flex items-stretch gap-2">
            <Link
              href={`/activities/${activity.id}`}
              className="min-w-0 flex-1 rounded-2xl border border-coral-light bg-white p-4 shadow-sm transition-colors hover:border-coral"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display font-semibold text-ink">{activity.title}</h2>
                {activity.is_archived && (
                  <span className="shrink-0 rounded-full bg-ink/10 px-2 py-0.5 text-xs font-medium text-ink/50">
                    Archived
                  </span>
                )}
              </div>
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

            {/* Quick actions — archive/unarchive + delete without opening the activity */}
            <div className="flex flex-col justify-center gap-1.5">
              <form action={activity.is_archived ? unarchiveActivity : archiveActivity}>
                <input type="hidden" name="id" value={activity.id} />
                <button
                  type="submit"
                  title={activity.is_archived ? "Unarchive" : "Archive"}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink/15 text-sm text-ink/40 hover:border-ink/30 hover:text-ink/60"
                >
                  {activity.is_archived ? "↩" : "📦"}
                </button>
              </form>
              <form action={deleteActivity} onSubmit={(e) => { if (!confirm("Permanently delete this activity?")) e.preventDefault(); }}>
                <input type="hidden" name="id" value={activity.id} />
                <button
                  type="submit"
                  title="Delete permanently"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink/15 text-sm text-ink/40 hover:border-coral/40 hover:text-coral-dark"
                >
                  ✕
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
