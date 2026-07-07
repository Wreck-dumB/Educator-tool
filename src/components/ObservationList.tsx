import { getSignedPhotoUrl } from "@/lib/supabase/observations";
import type { ObservationWithDetails } from "@/lib/supabase/observations";
import { cardClass } from "@/lib/ui";
import FollowUpPanel from "@/components/FollowUpPanel";

interface ChildContext {
  id: string;
  interests?: string | null;
}

interface Props {
  observations: ObservationWithDetails[];
  title?: string;
  childContextMap?: Map<string, ChildContext>;
  showFollowUp?: boolean;
}

export default async function ObservationList({
  observations,
  title = "Past observations",
  childContextMap,
  showFollowUp = true,
}: Props) {
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
    <div className={`mt-6 ${cardClass}`}>
      <div className="border-b border-coral-light px-4 py-3">
        <h2 className="font-display text-sm font-semibold text-ink">{title}</h2>
      </div>
      <ul className="divide-y divide-coral-light">
        {observations.map((o) => {
          const photoUrl = photoUrlMap.get(o.id);
          return (
            <li key={o.id} className="flex items-start gap-3 px-4 py-3">
              {photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt="Observation photo"
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{o.child_name}</p>
                  <p className="shrink-0 text-xs text-ink/40">
                    {new Date(o.observed_at).toLocaleDateString()}
                  </p>
                </div>
                <p className="mt-0.5 text-sm text-ink/70">{o.note_text}</p>
                {o.eylf_codes.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {o.eylf_codes.map((code) => (
                      <span
                        key={code}
                        className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                )}
                {showFollowUp && (
                  <FollowUpPanel
                    observationId={o.id}
                    observationNote={o.note_text}
                    childName={o.child_name}
                    childInterests={childContextMap?.get(o.child_id)?.interests}
                    eylfCodes={o.eylf_codes}
                    activityTitle={o.activity_title}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
