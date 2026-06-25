import Link from "next/link";
import { notFound } from "next/navigation";
import { getSafeWorkProcedure } from "@/lib/supabase/safeWorkProcedures";
import { getRiskRatingBadgeClass } from "@/lib/icons";
import PrintButton from "@/components/PrintButton";
import { markSafeWorkProcedureReviewed } from "../actions";

export default async function SafeWorkProcedureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const procedure = await getSafeWorkProcedure(id);
  if (!procedure) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 print:px-0 print:py-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href="/safe-work-procedures" className="text-sm text-coral-dark hover:underline">
          ← Back
        </Link>
        <PrintButton />
      </div>

      <div className="mt-4 print:mt-0">
        <h1 className="font-display text-2xl font-semibold text-coral-dark print:text-black">{procedure.task_title}</h1>
        <p className="mt-1 text-sm text-ink/60 print:text-black">
          Generated {new Date(procedure.created_at).toLocaleDateString()}
        </p>
        {procedure.task_description && (
          <p className="mt-1 text-sm text-ink/70 print:text-black">{procedure.task_description}</p>
        )}

        <p className="mt-4 rounded-xl bg-amber-light p-3 text-xs text-amber-dark print:rounded-none print:border print:border-black print:bg-white print:text-black">
          This is a <strong>starting draft</strong> for a hazardous routine task, not a legal &ldquo;SWMS&rdquo;
          (that term applies only to specific high-risk construction work). Review it, adjust for your own
          service, and have it checked by your nominated supervisor before relying on it.
        </p>

        {procedure.ppe_required.length > 0 && (
          <p className="mt-4 text-sm text-ink/80 print:text-black">
            <span className="font-medium">PPE required:</span> {procedure.ppe_required.join(", ")}
          </p>
        )}

        {procedure.steps.length > 0 && (
          <>
            <p className="mt-4 text-sm font-medium text-ink print:text-black">Procedure</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-ink/80 print:text-black">
              {procedure.steps.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ol>
          </>
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
            {procedure.hazards.map((h, idx) => (
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
          <div className="flex items-center justify-between print:hidden">
            <p className="font-medium">
              {procedure.reviewed_at ? (
                <span className="text-sage-dark">✓ Reviewed {new Date(procedure.reviewed_at).toLocaleDateString()}</span>
              ) : (
                <span className="text-amber-dark">Unreviewed draft</span>
              )}
            </p>
            {!procedure.reviewed_at && (
              <form action={async () => { await markSafeWorkProcedureReviewed(procedure.id); }}>
                <button type="submit" className="text-xs font-medium text-sage-dark hover:underline">
                  Mark as reviewed
                </button>
              </form>
            )}
          </div>
          <p className="mt-4 font-medium">Sign-off</p>
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
