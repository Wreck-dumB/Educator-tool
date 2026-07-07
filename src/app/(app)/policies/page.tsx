import Link from "next/link";
import { getPolicies } from "@/lib/supabase/policies";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { cardClass } from "@/lib/ui";
import PolicyForm from "./PolicyForm";

export default async function PoliciesPage() {
  const [policies, myRole] = await Promise.all([getPolicies(), getMyStaffRole()]);
  const canManage = myRole === "director" || myRole === "2ic";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Policy builder</h1>
      <p className="mt-1 text-sm text-ink/60">
        Describe your service&apos;s situation for any policy area required under the Education and Care
        Services National Regulations (incident/injury, medical conditions, excursions, sleep &amp; rest,
        enrolment, and more) — get a drafted policy back, plus a gap-check of anything your description
        didn&apos;t cover. Every draft needs review and approval by your approved provider/nominated
        supervisor before adoption.
      </p>

      {canManage && (
        <div className="mt-6">
          <PolicyForm />
        </div>
      )}

      <div className="mt-6 space-y-4">
        {policies.length === 0 && <p className="text-sm text-ink/50">No policies drafted yet.</p>}
        {policies.map((p) => (
          <Link key={p.id} href={`/policies/${p.id}`} className={`block p-4 ${cardClass} transition-colors hover:border-coral`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-semibold text-ink">{p.title}</h2>
              <span className="shrink-0 rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark">
                {p.category}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink/50">
              {p.reviewed_at ? (
                <span className="text-sage-dark">Reviewed {new Date(p.reviewed_at).toLocaleDateString()}</span>
              ) : (
                <span className="text-amber-dark">Unreviewed draft</span>
              )}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
