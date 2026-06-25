import Link from "next/link";
import { notFound } from "next/navigation";
import { getRiskAssessment } from "@/lib/supabase/riskAssessments";
import { getRiskRatingBadgeClass } from "@/lib/icons";
import PrintButton from "@/components/PrintButton";

export default async function RiskAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assessment = await getRiskAssessment(id);
  if (!assessment) notFound();

  const flags: string[] = [];
  if (assessment.involves_excursion) flags.push("Leaves the premises — needs its own excursion risk assessment (Regs 100-103)");
  if (assessment.involves_sleep_rest) flags.push("Involves sleep/rest — needs the separate sleep & rest risk assessment");
  if (assessment.involves_water) flags.push("Involves water — review water-safety supervision separately");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 print:px-0 print:py-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={assessment.activity_id ? `/activities/${assessment.activity_id}` : "/risk-assessments"} className="text-sm text-coral-dark hover:underline">
          ← Back
        </Link>
        <PrintButton />
      </div>

      <div className="mt-4 print:mt-0">
        <h1 className="font-display text-2xl font-semibold text-coral-dark print:text-black">{assessment.title}</h1>
        <p className="mt-1 text-sm text-ink/60 print:text-black">
          Generated {new Date(assessment.created_at).toLocaleDateString()}
          {assessment.activity_title && <> &middot; for activity &ldquo;{assessment.activity_title}&rdquo;</>}
        </p>
        {assessment.context_notes && (
          <p className="mt-1 text-sm text-ink/70 print:text-black">{assessment.context_notes}</p>
        )}

        <p className="mt-4 rounded-xl bg-amber-light p-3 text-xs text-amber-dark print:rounded-none print:border print:border-black print:bg-white print:text-black">
          This is a <strong>starting draft</strong> based on the activity&apos;s materials and steps. Review it,
          adjust for your own service/environment, and have it checked by your nominated supervisor or
          educational leader before relying on it. It does not replace the separate risk assessments the
          National Regulations require for excursions, sleep &amp; rest, or emergencies.
        </p>

        {flags.length > 0 && (
          <div className="mt-3 rounded-xl bg-coral-light p-3 text-xs text-coral-dark print:rounded-none print:border print:border-black print:bg-white print:text-black">
            <ul className="list-disc space-y-0.5 pl-4">
              {flags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-ink/20 text-left text-xs uppercase tracking-wide text-ink/50 print:text-black">
              <th className="py-2 pr-2">Hazard</th>
              <th className="py-2 pr-2">Who could be harmed</th>
              <th className="py-2 pr-2">Likelihood</th>
              <th className="py-2 pr-2">Consequence</th>
              <th className="py-2 pr-2">Rating</th>
              <th className="py-2">Control measures</th>
            </tr>
          </thead>
          <tbody>
            {assessment.hazards.map((h, idx) => (
              <tr key={idx} className="border-b border-ink/10 align-top">
                <td className="py-2 pr-2 font-medium text-ink print:text-black">{h.hazard}</td>
                <td className="py-2 pr-2 text-ink/70 print:text-black">{h.who_could_be_harmed}</td>
                <td className="py-2 pr-2 text-ink/70 print:text-black">{h.likelihood.replace("_", " ")}</td>
                <td className="py-2 pr-2 text-ink/70 print:text-black">{h.consequence}</td>
                <td className="py-2 pr-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${getRiskRatingBadgeClass(h.risk_rating)} print:border print:border-black print:bg-white print:text-black`}>
                    {h.risk_rating}
                  </span>
                </td>
                <td className="py-2 text-ink/70 print:text-black">
                  <ul className="list-disc space-y-0.5 pl-4">
                    {h.control_measures.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-10 break-inside-avoid border-t border-ink/20 pt-4 text-sm text-ink/80 print:text-black">
          <p className="font-medium">Sign-off</p>
          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <p className="border-b border-ink/40 pb-6"></p>
              <p className="mt-1 text-xs text-ink/50 print:text-black">Reviewed by (name)</p>
            </div>
            <div>
              <p className="border-b border-ink/40 pb-6"></p>
              <p className="mt-1 text-xs text-ink/50 print:text-black">Position / role</p>
            </div>
            <div>
              <p className="border-b border-ink/40 pb-6"></p>
              <p className="mt-1 text-xs text-ink/50 print:text-black">Signature</p>
            </div>
            <div>
              <p className="border-b border-ink/40 pb-6"></p>
              <p className="mt-1 text-xs text-ink/50 print:text-black">Date / next review date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
