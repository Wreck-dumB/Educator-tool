import { notFound } from "next/navigation";
import Link from "next/link";
import { getChild } from "@/lib/supabase/children";
import { getChildIncidentReportsByChild } from "@/lib/supabase/incidents";
import { cardClass } from "@/lib/ui";
import BehaviourSupportForm from "@/components/BehaviourSupportForm";

const RECORD_TYPE_LABELS: Record<string, string> = {
  incident: "Incident",
  injury: "Injury",
  trauma: "Trauma",
  illness: "Illness",
};

export default async function ChildSupportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [child, incidents] = await Promise.all([getChild(id), getChildIncidentReportsByChild(id)]);

  if (!child) notFound();

  // Compute frequency summary for last 30 / 90 days
  const now = new Date();
  const last30 = incidents.filter(
    (r) => (now.getTime() - new Date(r.occurred_at).getTime()) / (1000 * 60 * 60 * 24) <= 30,
  );
  const last90 = incidents.filter(
    (r) => (now.getTime() - new Date(r.occurred_at).getTime()) / (1000 * 60 * 60 * 24) <= 90,
  );

  // Group by type
  const countByType = incidents.slice(0, 20).reduce<Record<string, number>>((acc, r) => {
    acc[r.record_type] = (acc[r.record_type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={`/children/${child.id}`} className="text-sm text-coral-dark hover:underline">
          ← {child.first_name}
        </Link>
      </div>

      <h1 className="font-display mt-2 text-3xl font-semibold text-coral-dark">
        Behaviour &amp; Support — {child.first_name}
      </h1>
      <p className="mt-1 text-sm text-ink/60">
        Review {child.first_name}&apos;s incident history and get AI-generated support strategies tailored to their
        profile and observations.
      </p>

      {/* Incident summary stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className={`p-4 text-center ${cardClass}`}>
          <p className="text-2xl font-bold text-coral-dark">{last30.length}</p>
          <p className="mt-0.5 text-xs text-ink/50">Last 30 days</p>
        </div>
        <div className={`p-4 text-center ${cardClass}`}>
          <p className="text-2xl font-bold text-coral-dark">{last90.length}</p>
          <p className="mt-0.5 text-xs text-ink/50">Last 90 days</p>
        </div>
        <div className={`p-4 text-center ${cardClass}`}>
          <p className="text-2xl font-bold text-coral-dark">{incidents.length}</p>
          <p className="mt-0.5 text-xs text-ink/50">All time</p>
        </div>
      </div>

      {/* Type breakdown */}
      {Object.keys(countByType).length > 0 && (
        <div className={`mt-4 flex flex-wrap gap-2 p-4 ${cardClass}`}>
          {Object.entries(countByType)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <span
                key={type}
                className="rounded-full bg-coral-light px-3 py-1 text-xs font-semibold text-coral-dark"
              >
                {RECORD_TYPE_LABELS[type] ?? type}: {count}
              </span>
            ))}
        </div>
      )}

      {/* Recent incident log */}
      <div className={`mt-4 ${cardClass}`}>
        <div className="border-b border-coral-light px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">Incident history</h2>
        </div>
        {incidents.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink/50">No incidents recorded for {child.first_name}.</p>
        ) : (
          <ul className="divide-y divide-coral-light">
            {incidents.slice(0, 20).map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-coral-dark">
                        {RECORD_TYPE_LABELS[r.record_type] ?? r.record_type}
                      </span>
                      <span className="text-xs text-ink/40">
                        {new Date(r.occurred_at).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink/80">{r.description}</p>
                    {r.action_taken && (
                      <p className="mt-0.5 text-xs text-ink/50">Action: {r.action_taken}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* AI Support strategies */}
      <div className={`mt-6 p-5 ${cardClass}`}>
        <h2 className="font-display text-sm font-semibold text-ink">AI support strategies</h2>
        <p className="mt-1 text-xs text-ink/50">
          Describe what&apos;s happening right now and get strategies tailored to {child.first_name}&apos;s profile,
          interests, and incident history.
        </p>
        <div className="mt-4">
          <BehaviourSupportForm childId={child.id} childName={child.first_name} />
        </div>
      </div>
    </div>
  );
}
