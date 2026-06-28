import { getDevelopmentalMilestones } from "@/lib/supabase/milestones";
import { getMilestoneDomainIcon, getMilestoneDomainLabel } from "@/lib/icons";
import { cardClass } from "@/lib/ui";
import type { DevelopmentalMilestone } from "@/lib/types/domain";

export default async function MilestonesPage() {
  const milestones = await getDevelopmentalMilestones();

  const byAgeBand = milestones.reduce<Record<string, DevelopmentalMilestone[]>>((acc, m) => {
    (acc[m.age_band] ??= []).push(m);
    return acc;
  }, {});
  const ageBands = Object.keys(byAgeBand).sort(
    (a, b) => byAgeBand[a][0].age_band_order - byAgeBand[b][0].age_band_order,
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Developmental milestones</h1>
      <p className="mt-1 text-sm text-ink/60">
        A general guide to typical physical, language, social-emotional, and cognitive development
        from birth to 5 years — separate from the EYLF outcomes, which are curriculum dispositions
        without expected ages. Sourced from Australian health-system guidance (Sydney Children&apos;s
        Hospitals Network, healthdirect, and cross-referenced state resources).
      </p>
      <p className="mt-2 rounded-xl bg-amber-light px-3 py-2 text-xs text-amber-dark">
        Every child develops at their own pace — this is a general guide for planning, not a
        screening or diagnostic tool. If you have concerns about a child&apos;s development, refer to
        a GP, maternal &amp; child health nurse, or paediatrician.
      </p>

      <div className="mt-6 space-y-6">
        {ageBands.map((band) => (
          <div key={band} className={`p-4 ${cardClass}`}>
            <h2 className="font-display text-lg font-semibold text-ink">{band}</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(["gross_motor", "fine_motor", "language", "social_emotional", "cognitive"] as const).map(
                (domain) => {
                  const items = byAgeBand[band].filter((m) => m.domain === domain);
                  if (items.length === 0) return null;
                  return (
                    <div key={domain}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                        {getMilestoneDomainIcon(domain)} {getMilestoneDomainLabel(domain)}
                      </p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-ink/80">
                        {items.map((m) => (
                          <li key={m.id}>{m.milestone_text}</li>
                        ))}
                      </ul>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
