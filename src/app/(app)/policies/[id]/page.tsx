import Link from "next/link";
import { notFound } from "next/navigation";
import { getPolicy } from "@/lib/supabase/policies";
import PrintButton from "@/components/PrintButton";
import { markPolicyReviewed } from "../actions";

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const policy = await getPolicy(id);
  if (!policy) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 print:px-0 print:py-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href="/policies" className="text-sm text-coral-dark hover:underline">
          ← Back
        </Link>
        <PrintButton />
      </div>

      <div className="mt-4 print:mt-0">
        <p className="text-xs font-medium uppercase tracking-wide text-sage-dark print:text-black">{policy.category}</p>
        <h1 className="font-display text-2xl font-semibold text-coral-dark print:text-black">{policy.title}</h1>
        <p className="mt-1 text-sm text-ink/60 print:text-black">
          Drafted {new Date(policy.created_at).toLocaleDateString()}
        </p>

        <p className="mt-4 rounded-xl bg-amber-light p-3 text-xs text-amber-dark print:rounded-none print:border print:border-black print:bg-white print:text-black">
          This is a <strong>starting draft</strong>. It must be reviewed, customised, and formally approved
          by your approved provider or nominated supervisor before adoption as a service policy.
        </p>

        {policy.purpose && (
          <>
            <p className="mt-4 text-sm font-medium text-ink print:text-black">Purpose</p>
            <p className="mt-1 text-sm text-ink/80 print:text-black">{policy.purpose}</p>
          </>
        )}

        {policy.scope && (
          <>
            <p className="mt-4 text-sm font-medium text-ink print:text-black">Scope</p>
            <p className="mt-1 text-sm text-ink/80 print:text-black">{policy.scope}</p>
          </>
        )}

        {policy.procedure_steps.length > 0 && (
          <>
            <p className="mt-4 text-sm font-medium text-ink print:text-black">Procedure</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-ink/80 print:text-black">
              {policy.procedure_steps.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ol>
          </>
        )}

        {policy.related_legislation.length > 0 && (
          <>
            <p className="mt-4 text-sm font-medium text-ink print:text-black">Related legislation / areas</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink/80 print:text-black">
              {policy.related_legislation.map((l, idx) => (
                <li key={idx}>{l}</li>
              ))}
            </ul>
          </>
        )}

        {policy.suggested_additions.length > 0 && (
          <div className="mt-4 rounded-xl bg-amber-light p-3 print:rounded-none print:border print:border-black print:bg-white">
            <p className="text-sm font-medium text-amber-dark print:text-black">
              Worth considering — not yet reflected in this draft
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-amber-dark/90 print:text-black">
              {policy.suggested_additions.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <details className="mt-4 print:hidden">
          <summary className="cursor-pointer text-xs text-ink/40">What was originally described</summary>
          <p className="mt-1 text-xs text-ink/50">{policy.your_input}</p>
        </details>

        <div className="mt-10 break-inside-avoid border-t border-ink/20 pt-4 text-sm text-ink/80 print:text-black">
          <div className="flex items-center justify-between print:hidden">
            <p className="font-medium">
              {policy.reviewed_at ? (
                <span className="text-sage-dark">✓ Reviewed {new Date(policy.reviewed_at).toLocaleDateString()}</span>
              ) : (
                <span className="text-amber-dark">Unreviewed draft</span>
              )}
            </p>
            {!policy.reviewed_at && (
              <form action={async () => { await markPolicyReviewed(policy.id); }}>
                <button type="submit" className="text-xs font-medium text-sage-dark hover:underline">
                  Mark as reviewed
                </button>
              </form>
            )}
          </div>
          <p className="mt-4 font-medium">Approval</p>
          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <p className="border-b border-ink/40 pb-6"></p>
              <p className="mt-1 text-xs text-ink/50 print:text-black">Approved by (name)</p>
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
