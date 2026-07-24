import Link from "next/link";
import { getObservations, getSignedPhotoUrl } from "@/lib/supabase/observations";
import { getChildren } from "@/lib/supabase/children";
import { getEylfOutcomes } from "@/lib/supabase/eylf";
import { getServiceObservationTypes } from "@/lib/supabase/services";
import { logObservation, shareObservation, unshareObservation } from "@/app/(app)/observations/actions";
import { addFollowUp } from "@/app/(app)/follow-ups/actions";
import { cardClass, errorBannerClass } from "@/lib/ui";
import ObservationForm, { ObservationTypeName } from "@/components/ObservationForm";
import { getShiftAccess } from "@/lib/supabase/shiftAccess";
import ShiftLockedNotice from "@/components/ShiftLockedNotice";

const OBS_TYPE_LABELS: Record<string, string> = {
  anecdotal: "Anecdotal",
  learning_story: "Learning story",
  running_record: "Running record",
  jotting: "Jotting",
  work_sample: "Work sample",
  photo_caption: "Photo caption",
  developmental_note: "Dev note",
};

export default async function ObservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; error?: string }>;
}) {
  const { child: childFilter, error } = await searchParams;

  const access = await getShiftAccess();
  if (access.restricted && !access.allowed) return <ShiftLockedNotice />;

  const [observations, children, outcomes, enabledObsTypes] = await Promise.all([
    getObservations(childFilter),
    getChildren(),
    getEylfOutcomes(),
    getServiceObservationTypes(),
  ]);

  // Resolve signed photo URLs for observations that have photos
  const photoUrlMap = new Map<string, string>();
  await Promise.all(
    observations
      .filter((o) => o.photo_url)
      .map(async (o) => {
        const url = await getSignedPhotoUrl(o.photo_url!);
        if (url) photoUrlMap.set(o.id, url);
      })
  );

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
          <div className="mt-4">
            <ObservationForm
              action={logObservation}
              children={children}
              outcomes={outcomes}
              returnTo="/observations"
              enabledTypes={enabledObsTypes as ObservationTypeName[]}
            />
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {observations.length === 0 && (
          <p className="text-sm text-ink/50">No observations logged yet.</p>
        )}
        {observations.map((o) => {
          const photoUrl = photoUrlMap.get(o.id);
          return (
            <div key={o.id} className={`p-4 ${cardClass}`}>
              <div className="flex items-start gap-3">
                {photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt="Observation photo"
                    className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-ink">{o.child_name}</p>
                      {o.observation_type && o.observation_type !== "anecdotal" && (
                        <span className="rounded-full bg-sage-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sage-dark">
                          {OBS_TYPE_LABELS[o.observation_type] ?? o.observation_type}
                        </span>
                      )}
                    </div>
                    <p className="shrink-0 text-xs text-ink/40">{new Date(o.observed_at).toLocaleDateString()}</p>
                  </div>
                  {o.observation_title && (
                    <p className="mt-0.5 text-xs font-semibold text-ink/60">{o.observation_title}</p>
                  )}
                  <p className="mt-1 text-sm text-ink/80">{o.note_text}</p>
                  {o.observation_context && (
                    <p className="mt-1 border-l-2 border-sage-light pl-2 text-xs text-ink/60 italic">{o.observation_context}</p>
                  )}
                  {o.activity_title && (
                    <p className="mt-1 text-xs text-ink/50">From: {o.activity_title}</p>
                  )}
                  {o.eylf_codes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
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
                  <div className="mt-3 border-t border-coral-light/50 pt-2">
                    <div className="flex items-center gap-3">
                      {o.shared_with_parent_at ? (
                        <>
                          <span className="text-xs text-sage-dark">Shared with parent</span>
                          <form action={unshareObservation}>
                            <input type="hidden" name="id" value={o.id} />
                            <button type="submit" className="text-xs text-ink/40 hover:text-coral-dark">
                              Unshare
                            </button>
                          </form>
                        </>
                      ) : (
                        <form action={shareObservation}>
                          <input type="hidden" name="id" value={o.id} />
                          <button type="submit" className="text-xs text-ink/40 hover:text-sage-dark">
                            Share with parent
                          </button>
                        </form>
                      )}
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-ink/40 hover:text-coral-dark list-none [&::-webkit-details-marker]:hidden">
                        + Note a follow-up
                      </summary>
                      <form action={addFollowUp} className="mt-2 space-y-2">
                        <input type="hidden" name="child_id" value={o.child_id} />
                        <input type="hidden" name="observation_id" value={o.id} />
                        <input type="hidden" name="return_to" value="/observations" />
                        <textarea
                          name="note"
                          placeholder="What will you do next to extend this learning?"
                          rows={2}
                          required
                          className="w-full rounded-xl border border-coral-light px-3 py-2 text-xs text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="rounded-xl bg-coral px-3 py-1.5 text-xs font-semibold text-white hover:bg-coral-dark"
                        >
                          Save follow-up
                        </button>
                      </form>
                    </details>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
