import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { inputClass, cardClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import { createComplaintRecord, updateComplaintStatus, deleteComplaintRecord } from "./actions";

const COMPLAINANT_LABELS: Record<string, string> = {
  parent: "Family/parent",
  staff: "Staff member",
  child: "Child",
  community: "Community member",
  anonymous: "Anonymous",
  regulatory_body: "Regulatory body",
};

const STATUS_LABELS: Record<string, string> = {
  received: "Received",
  acknowledged: "Acknowledged",
  under_review: "Under review",
  resolved: "Resolved",
  escalated: "Escalated",
};

const STATUS_COLORS: Record<string, string> = {
  received: "bg-amber-100 text-amber-800",
  acknowledged: "bg-coral-light text-coral-dark",
  under_review: "bg-coral-light text-coral-dark",
  resolved: "bg-sage-light text-sage-dark",
  escalated: "bg-red-100 text-red-800",
};

export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const ownerUserId = await getMyServiceOwnerId();
  const myRole = await getMyStaffRole();
  const canManage = myRole === "director" || myRole === "2ic";

  const supabase = await createClient();
  const { data: complaints } = await supabase
    .from("complaint_records")
    .select("*")
    .eq("owner_user_id", ownerUserId ?? "")
    .order("received_at", { ascending: false });

  const open = (complaints ?? []).filter((c) => c.status !== "resolved");
  const resolved = (complaints ?? []).filter((c) => c.status === "resolved");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Complaints &amp; Concerns</h1>
      <p className="mt-1 text-sm text-ink/60">
        Documented complaints and concerns from families, staff, children, or the community. A
        transparent, responsive complaints process is required under NQS Quality Area 5.7 and Child
        Safe Standard 10. Every complaint logged here is date-stamped and tracked to resolution.
      </p>

      <div className="mt-4 rounded-2xl border border-sage-light bg-sage-light/30 p-4 text-xs text-ink/70 space-y-1">
        <p className="font-semibold text-ink/80">What to log here</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Any complaint, concern, or grievance from a parent, carer, or community member</li>
          <li>Staff grievances or workplace concerns</li>
          <li>Any concern raised by a child (documented by an educator)</li>
          <li>Complaints from the regulatory authority or other agencies</li>
          <li>Anonymous concerns received verbally or in writing</li>
        </ul>
        <p className="pt-1">
          All complaints should be acknowledged within 24 hours and resolved as soon as practicable.
          The Director must be notified of any complaint relating to child safety, abuse, or
          regulatory non-compliance immediately.
        </p>
      </div>

      {error && <p className={`mt-4 ${errorBannerClass}`}>{error}</p>}

      {/* Log new complaint */}
      <div className={`mt-6 p-5 ${cardClass}`}>
        <h2 className="font-display text-lg font-semibold text-ink">Log a complaint or concern</h2>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-coral-dark">
            Record a new entry
          </summary>
          <form action={createComplaintRecord} className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink/70">Received from</label>
                <select name="complainant_type" defaultValue="parent" className={inputClass}>
                  {Object.entries(COMPLAINANT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70">Date &amp; time received</label>
                <input
                  type="datetime-local"
                  name="received_at"
                  defaultValue={new Date().toISOString().slice(0, 16)}
                  className={inputClass}
                />
              </div>
            </div>
            <input
              name="subject"
              type="text"
              placeholder="Brief subject (e.g. 'Concern about outdoor supervision')"
              required
              className={inputClass}
            />
            <textarea
              name="description"
              rows={4}
              required
              placeholder="Full description of the complaint or concern, including any relevant context. Be factual and specific."
              className={inputClass}
            />
            <button type="submit" className={`w-full ${primaryButtonClass}`}>
              Log complaint
            </button>
          </form>
        </details>
      </div>

      {/* Open complaints */}
      <div className={`mt-6 p-5 ${cardClass}`}>
        <h2 className="font-display text-lg font-semibold text-ink">
          Open ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="mt-3 text-sm text-ink/50">No open complaints.</p>
        ) : (
          <ul className="mt-3 divide-y divide-coral-light">
            {open.map((c) => (
              <li key={c.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{c.subject}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                      <span className="text-xs text-ink/40">
                        {COMPLAINANT_LABELS[c.complainant_type] ?? c.complainant_type}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink/50">
                      Received {new Date(c.received_at).toLocaleString("en-AU")}
                    </p>
                    <p className="mt-1 text-sm text-ink/80">{c.description}</p>

                    {canManage && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs font-medium text-coral-dark">
                          Update status
                        </summary>
                        <form action={updateComplaintStatus} className="mt-2 space-y-2">
                          <input type="hidden" name="id" value={c.id} />
                          <select name="status" defaultValue={c.status} className={inputClass}>
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                          <textarea
                            name="resolution_notes"
                            rows={2}
                            defaultValue={c.resolution_notes ?? ""}
                            placeholder="Resolution notes / actions taken"
                            className={inputClass}
                          />
                          <button type="submit" className="rounded-full bg-coral-light px-4 py-1.5 text-xs font-semibold text-coral-dark hover:bg-coral/20">
                            Save update
                          </button>
                        </form>
                      </details>
                    )}
                  </div>
                  {myRole === "director" && (
                    <form action={deleteComplaintRecord}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="shrink-0 text-xs text-ink/30 hover:text-coral-dark">
                        Remove
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className={`mt-6 p-5 ${cardClass}`}>
          <h2 className="font-display text-lg font-semibold text-ink">
            Resolved ({resolved.length})
          </h2>
          <ul className="mt-3 divide-y divide-coral-light">
            {resolved.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink/70">{c.subject}</p>
                    <p className="text-xs text-ink/40">
                      {COMPLAINANT_LABELS[c.complainant_type]} · Received{" "}
                      {new Date(c.received_at).toLocaleDateString("en-AU")}
                      {c.resolved_at && ` · Resolved ${new Date(c.resolved_at).toLocaleDateString("en-AU")}`}
                    </p>
                    {c.resolution_notes && (
                      <p className="mt-1 border-l-2 border-sage-light pl-2 text-xs text-ink/60 italic">
                        {c.resolution_notes}
                      </p>
                    )}
                  </div>
                  {myRole === "director" && (
                    <form action={deleteComplaintRecord}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="shrink-0 text-xs text-ink/30 hover:text-coral-dark">
                        Remove
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
