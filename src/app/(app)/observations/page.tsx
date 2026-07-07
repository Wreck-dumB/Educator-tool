import Link from "next/link";
import { getObservations, getSignedPhotoUrl } from "@/lib/supabase/observations";
import { getChildren } from "@/lib/supabase/children";
import { getEylfOutcomes } from "@/lib/supabase/eylf";
import { logObservation } from "@/app/(app)/observations/actions";
import { cardClass, errorBannerClass } from "@/lib/ui";
import ObservationForm from "@/components/ObservationForm";

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
                    <p className="font-medium text-ink">{o.child_name}</p>
                    <p className="shrink-0 text-xs text-ink/40">{new Date(o.observed_at).toLocaleDateString()}</p>
                  </div>
                  <p className="mt-1 text-sm text-ink/80">{o.note_text}</p>
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
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
