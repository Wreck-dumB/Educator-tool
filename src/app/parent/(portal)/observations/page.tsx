import { getChildren } from "@/lib/supabase/children";
import { getSharedObservationsForParent } from "@/lib/supabase/observations";
import { getSignedPhotoUrl } from "@/lib/supabase/observations";
import { cardClass } from "@/lib/ui";

export default async function ParentObservationsPage() {
  const children = await getChildren();

  const observationsByChild = await Promise.all(
    children.map(async (child) => ({
      child,
      observations: await getSharedObservationsForParent(child.id),
    })),
  );

  // Collect all photo paths and resolve signed URLs in one pass
  const photoPaths = observationsByChild
    .flatMap(({ observations }) => observations)
    .filter((o) => o.photo_url)
    .map((o) => o.photo_url as string);

  const photoUrlMap = new Map<string, string>();
  await Promise.all(
    photoPaths.map(async (path) => {
      const url = await getSignedPhotoUrl(path);
      if (url) photoUrlMap.set(path, url);
    }),
  );

  const totalShared = observationsByChild.reduce((sum, { observations }) => sum + observations.length, 0);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Observations</h1>
      <p className="mt-1 text-sm text-ink/60">
        Moments your educator has shared with you from your child&apos;s day.
      </p>

      {totalShared === 0 && (
        <p className={`mt-6 p-5 text-sm text-ink/50 ${cardClass}`}>
          No observations have been shared yet — check back soon!
        </p>
      )}

      {observationsByChild.map(({ child, observations }) => {
        if (observations.length === 0) return null;
        return (
          <div key={child.id} className="mt-6">
            <h2 className="font-display mb-3 text-lg font-semibold text-ink">{child.first_name}</h2>
            <div className="space-y-4">
              {observations.map((o) => {
                const photoUrl = o.photo_url ? photoUrlMap.get(o.photo_url) : null;
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
                        <p className="text-xs text-ink/40">
                          {new Date(o.observed_at).toLocaleDateString("en-AU", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <p className="mt-1 text-sm text-ink/80">{o.note_text}</p>
                        {o.activity_title && (
                          <p className="mt-1 text-xs text-ink/50">Activity: {o.activity_title}</p>
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
      })}
    </div>
  );
}
