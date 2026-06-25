import Link from "next/link";
import { getObservations } from "@/lib/supabase/observations";
import { getChildren } from "@/lib/supabase/children";
import { getEylfOutcomes } from "@/lib/supabase/eylf";
import { logObservation } from "@/app/(app)/observations/actions";
import { inputClass, cardClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";

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
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Observations</h1>
      <p className="mt-1 text-sm text-ink/60">
        Everything you&apos;ve logged, with EYLF outcomes tagged for documentation.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      {children.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/observations"
            className={`rounded-full border px-3 py-1 text-sm ${
              !childFilter ? "border-coral bg-coral-light text-coral-dark" : "border-coral-light/60 text-ink/70"
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
                  ? "border-coral bg-coral-light text-coral-dark"
                  : "border-coral-light/60 text-ink/70"
              }`}
            >
              {c.first_name}
            </Link>
          ))}
        </div>
      )}

      {children.length > 0 && (
        <div className={`mt-6 p-5 ${cardClass}`}>
          <h2 className="font-display text-sm font-semibold text-ink">Log a new observation</h2>
          <form action={logObservation} className="mt-4 space-y-4">
            <input type="hidden" name="return_to" value="/observations" />
            <div>
              <label htmlFor="child_id" className="block text-sm font-medium text-ink/70">
                Child
              </label>
              <select id="child_id" name="child_id" required className={inputClass}>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="note_text" className="block text-sm font-medium text-ink/70">
                Observation note
              </label>
              <textarea id="note_text" name="note_text" required rows={3} className={inputClass} />
            </div>
            <div>
              <p className="text-sm font-medium text-ink/70">EYLF outcomes (optional)</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {outcomes.map((o) => (
                  <label key={o.id} className="flex items-center gap-1.5 text-sm text-ink/70">
                    <input type="checkbox" name="eylf_codes" value={o.code} />
                    {o.code}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className={`w-full ${primaryButtonClass}`}>
              Log observation
            </button>
          </form>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {observations.length === 0 && (
          <p className="text-sm text-ink/50">No observations logged yet.</p>
        )}
        {observations.map((o) => (
          <div key={o.id} className={`p-4 ${cardClass}`}>
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink">{o.child_name}</p>
              <p className="text-xs text-ink/40">{new Date(o.observed_at).toLocaleDateString()}</p>
            </div>
            <p className="mt-1 text-sm text-ink/80">{o.note_text}</p>
            {o.activity_title && (
              <p className="mt-1 text-xs text-ink/50">From activity: {o.activity_title}</p>
            )}
            {o.eylf_codes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {o.eylf_codes.map((code) => (
                  <span
                    key={code}
                    className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark"
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
