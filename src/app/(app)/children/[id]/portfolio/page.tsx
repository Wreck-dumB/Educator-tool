import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getChild } from "@/lib/supabase/children";
import { getObservations, getSignedPhotoUrl } from "@/lib/supabase/observations";
import PrintButton from "@/components/PrintButton";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const child = await getChild(id);
  return { title: child ? `${child.first_name} — Portfolio · SparkPlay` : "Portfolio · SparkPlay" };
}

function ageLabel(dob: string | null): string {
  if (!dob) return "";
  const birth = new Date(dob);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} old`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years} yr ${rem} mo` : `${years} year${years === 1 ? "" : "s"} old`;
}

export default async function PortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [child, observations] = await Promise.all([getChild(id), getObservations(id)]);
  if (!child) notFound();

  // Resolve signed photo URLs (1-hour expiry — long enough for a print session)
  const photoUrlMap = new Map<string, string>();
  await Promise.all(
    observations
      .filter((o) => o.photo_url)
      .map(async (o) => {
        const url = await getSignedPhotoUrl(o.photo_url!);
        if (url) photoUrlMap.set(o.id, url);
      }),
  );

  const allEylfCodes = [...new Set(observations.flatMap((o) => o.eylf_codes))].sort();
  const dateRange =
    observations.length > 0
      ? {
          from: new Date(observations[observations.length - 1].observed_at).toLocaleDateString("en-AU"),
          to: new Date(observations[0].observed_at).toLocaleDateString("en-AU"),
        }
      : null;

  const eylfByOutcome: Record<number, string[]> = {};
  for (const code of allEylfCodes) {
    const n = parseInt(code.charAt(0));
    if (!isNaN(n)) {
      (eylfByOutcome[n] ??= []).push(code);
    }
  }

  const OUTCOME_TITLES: Record<number, string> = {
    1: "Identity",
    2: "Community",
    3: "Wellbeing",
    4: "Learning",
    5: "Communication",
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Screen-only controls */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/children/${child.id}`} className="text-sm font-medium text-coral-dark hover:underline">
          ← Back to {child.first_name}
        </Link>
        <PrintButton />
      </div>

      {/* Portfolio content (prints cleanly) */}
      <div className="print:text-black">
        {/* Header */}
        <div className="mb-8 border-b-2 border-coral pb-6 print:border-black">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 print:text-black">
                Learning Portfolio
              </p>
              <h1 className="font-display mt-1 text-4xl font-bold text-coral-dark print:text-black">
                {child.first_name}
              </h1>
              {child.date_of_birth && (
                <p className="mt-1 text-sm text-ink/60 print:text-black">{ageLabel(child.date_of_birth)}</p>
              )}
              {child.current_interests && (
                <p className="mt-2 text-sm text-ink/70 print:text-black">
                  <span className="font-medium">Current interests:</span> {child.current_interests}
                </p>
              )}
            </div>
            <div className="text-right text-xs text-ink/40 print:text-black">
              <p>Generated {new Date().toLocaleDateString("en-AU")}</p>
              {dateRange && (
                <p className="mt-1">
                  {dateRange.from} — {dateRange.to}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Snapshot stats */}
        <div className="mb-8 grid grid-cols-3 gap-4 print:gap-6">
          <div className="rounded-2xl border border-coral-light p-4 text-center print:border-black">
            <p className="font-display text-3xl font-bold text-coral-dark print:text-black">
              {observations.length}
            </p>
            <p className="mt-1 text-xs text-ink/60 print:text-black">Observations</p>
          </div>
          <div className="rounded-2xl border border-coral-light p-4 text-center print:border-black">
            <p className="font-display text-3xl font-bold text-coral-dark print:text-black">
              {allEylfCodes.length}
            </p>
            <p className="mt-1 text-xs text-ink/60 print:text-black">EYLF outcomes</p>
          </div>
          <div className="rounded-2xl border border-coral-light p-4 text-center print:border-black">
            <p className="font-display text-3xl font-bold text-coral-dark print:text-black">
              {new Set(observations.map((o) => o.activity_id).filter(Boolean)).size}
            </p>
            <p className="mt-1 text-xs text-ink/60 print:text-black">Activities linked</p>
          </div>
        </div>

        {/* EYLF coverage */}
        {allEylfCodes.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display mb-3 text-lg font-semibold text-ink print:text-black">
              EYLF Outcomes covered
            </h2>
            <div className="space-y-2">
              {Object.entries(eylfByOutcome).map(([n, codes]) => (
                <div key={n} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-full bg-sage-light px-2.5 py-0.5 text-xs font-semibold text-sage-dark print:border print:border-black print:bg-transparent print:text-black">
                    Outcome {n}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-ink/60 print:text-black">
                      {OUTCOME_TITLES[Number(n)] ?? ""}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {codes.map((code) => (
                        <span
                          key={code}
                          className="rounded-full bg-sage-light/60 px-2 py-0.5 text-xs text-sage-dark print:border print:border-black print:bg-transparent print:text-black"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observations */}
        <h2 className="font-display mb-4 text-lg font-semibold text-ink print:text-black">
          Learning journey
        </h2>

        {observations.length === 0 ? (
          <p className="text-sm text-ink/50 print:text-black">No observations recorded yet.</p>
        ) : (
          <div className="space-y-5">
            {observations.map((o) => {
              const photoUrl = photoUrlMap.get(o.id);
              return (
                <div
                  key={o.id}
                  className="rounded-2xl border border-coral-light p-4 print:break-inside-avoid print:border-black"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-ink/40 print:text-black">
                      {new Date(o.observed_at).toLocaleDateString("en-AU", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {o.activity_title && (
                      <span className="shrink-0 text-xs text-ink/40 print:text-black">
                        Activity: {o.activity_title}
                      </span>
                    )}
                  </div>
                  {photoUrl && (
                    <div className="mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrl}
                        alt="Observation photo"
                        className="w-full max-h-64 rounded-xl object-cover print:max-h-48"
                      />
                    </div>
                  )}
                  <p className="text-sm leading-relaxed text-ink print:text-black">{o.note_text}</p>
                  {o.eylf_codes.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {o.eylf_codes.map((code) => (
                        <span
                          key={code}
                          className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark print:border print:border-black print:bg-transparent print:text-black"
                        >
                          EYLF {code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 border-t border-coral-light pt-4 text-xs text-ink/40 print:border-black print:text-black">
          <p>
            Generated by SparkPlay · {new Date().toLocaleDateString("en-AU")} · Based on the Early
            Years Learning Framework (EYLF) V2.0
          </p>
        </div>
      </div>
    </div>
  );
}
