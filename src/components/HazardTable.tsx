import type { Hazard } from "@/lib/types/database.types";
import { getRiskRatingBadgeClass } from "@/lib/icons";

export default function HazardTable({ hazards }: { hazards: Hazard[] }) {
  if (hazards.length === 0) return <p className="text-sm text-ink/50">No hazards identified.</p>;
  return (
    <div className="space-y-3">
      {hazards.map((h, idx) => (
        <div key={idx} className="rounded-xl bg-cream-dark/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-ink">{h.hazard}</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${getRiskRatingBadgeClass(h.risk_rating)}`}>
              {h.risk_rating}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink/50">
            Who could be harmed: {h.who_could_be_harmed} &middot; Likelihood: {h.likelihood.replace("_", " ")} &middot; Consequence: {h.consequence}
          </p>
          {h.control_measures.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm text-ink/70">
              {h.control_measures.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
