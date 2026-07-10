import { getVisitorLog, getCurrentlyOnsiteVisitors } from "@/lib/supabase/visitorLog";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { inputClass, cardClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import { signInVisitor, signOutVisitor, deleteVisitorLog } from "./actions";

const VISITOR_TYPE_LABELS: Record<string, string> = {
  volunteer: "Volunteer",
  contractor: "Contractor",
  delivery: "Delivery",
  government_inspector: "Government inspector",
  student_placement: "Student placement",
  parent_observer: "Parent observer",
  other: "Other",
};

export default async function VisitorLogPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [onsite, allLogs, myRole] = await Promise.all([
    getCurrentlyOnsiteVisitors(),
    getVisitorLog(50),
    getMyStaffRole(),
  ]);

  const isDirector = myRole === "director";
  const pastLogs = allLogs.filter((v) => v.signed_out_at !== null);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Visitor log</h1>
      <p className="mt-1 text-sm text-ink/60">
        Required under NQS QA2 and WHS policy. Record every person who enters the service
        — contractors, inspectors, student placements, volunteers, and parent observers.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      {/* ─── Currently on site ─────────────────────────────────────────────── */}
      {onsite.length > 0 && (
        <div className={`mt-6 ${cardClass} p-4`}>
          <h2 className="mb-3 text-lg font-semibold text-ink">Currently on site</h2>
          <div className="space-y-3">
            {onsite.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl bg-sage-light px-4 py-3">
                <div>
                  <p className="font-medium text-sage-dark">{v.visitor_name}</p>
                  <p className="text-xs text-sage-dark/70">
                    {VISITOR_TYPE_LABELS[v.visitor_type] ?? v.visitor_type}
                    {v.organisation ? ` · ${v.organisation}` : ""}
                    {" · "}Signed in{" "}
                    {new Date(v.signed_in_at).toLocaleTimeString("en-AU", { timeStyle: "short" })}
                  </p>
                  {!v.supervised && (
                    <p className="mt-0.5 text-xs font-semibold text-coral-dark">Unsupervised</p>
                  )}
                </div>
                <form action={signOutVisitor.bind(null, v.id)}>
                  <button type="submit" className="rounded-full border-2 border-sage px-3 py-1 text-xs font-semibold text-sage-dark hover:bg-white">
                    Sign out
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Sign in visitor ──────────────────────────────────────────────── */}
      <div className={`mt-6 ${cardClass} p-5`}>
        <h2 className="mb-4 text-lg font-semibold text-ink">Sign in visitor</h2>
        <form action={signInVisitor} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink">Full name</label>
              <input type="text" name="visitor_name" required placeholder="Jane Smith" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Visitor type</label>
              <select name="visitor_type" required className={inputClass}>
                {Object.entries(VISITOR_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink">Organisation</label>
              <input type="text" name="organisation" placeholder="Company / school (optional)" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Purpose of visit</label>
              <input type="text" name="purpose_of_visit" required placeholder="e.g. Plumbing repair" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink">ID checked?</label>
              <select name="id_checked" className={inputClass}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">WWCC checked?</label>
              <select name="wwcc_checked" className={inputClass}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Supervised?</label>
              <select name="supervised" className={inputClass}>
                <option value="yes">Yes</option>
                <option value="no">No – unsupervised</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">WWCC number</label>
            <input type="text" name="wwcc_number" placeholder="WWC1234567A (if applicable)" className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Notes</label>
            <input type="text" name="notes" placeholder="Any relevant notes (optional)" className={inputClass} />
          </div>

          <div className="flex justify-end">
            <button type="submit" className={primaryButtonClass}>Sign in</button>
          </div>
        </form>
      </div>

      {/* ─── Past visitors ────────────────────────────────────────────────── */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-ink">Visitor history</h2>
        {pastLogs.length === 0 ? (
          <p className="text-sm text-ink/50">No past visitors recorded.</p>
        ) : (
          <div className="space-y-2">
            {pastLogs.map((v) => (
              <div key={v.id} className={`${cardClass} px-4 py-3`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">
                      {v.visitor_name}
                      {v.organisation ? ` · ${v.organisation}` : ""}
                    </p>
                    <p className="text-xs text-ink/60">
                      {VISITOR_TYPE_LABELS[v.visitor_type] ?? v.visitor_type}
                      {" · "}
                      {new Date(v.signed_in_at).toLocaleDateString("en-AU")}
                      {" "}
                      {new Date(v.signed_in_at).toLocaleTimeString("en-AU", { timeStyle: "short" })}
                      {v.signed_out_at
                        ? ` – ${new Date(v.signed_out_at).toLocaleTimeString("en-AU", { timeStyle: "short" })}`
                        : ""}
                    </p>
                    <p className="text-xs text-ink/50">{v.purpose_of_visit}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {v.wwcc_checked && (
                        <span className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark">
                          WWCC{v.wwcc_number ? `: ${v.wwcc_number}` : " checked"}
                        </span>
                      )}
                      {v.id_checked && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                          ID checked
                        </span>
                      )}
                      {!v.supervised && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Unsupervised
                        </span>
                      )}
                    </div>
                  </div>
                  {isDirector && (
                    <form action={deleteVisitorLog.bind(null, v.id)}>
                      <button type="submit" className="text-xs text-ink/30 hover:text-coral-dark">
                        Delete
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
