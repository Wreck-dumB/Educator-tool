import { getMedicationLog } from "@/lib/supabase/medicationLog";
import { getChildren } from "@/lib/supabase/children";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { getStaffMembers } from "@/lib/supabase/staff";
import { getMyService } from "@/lib/supabase/staff";
import { inputClass, cardClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import { logMedication, deleteMedicationLog } from "./actions";

const ROUTE_LABELS: Record<string, string> = {
  oral: "Oral",
  topical: "Topical",
  inhaled: "Inhaled",
  eye_drops: "Eye drops",
  ear_drops: "Ear drops",
  nasal: "Nasal",
  injection: "Injection",
  other: "Other",
};

const AUTH_LABELS: Record<string, string> = {
  written_form: "Written form",
  verbal: "Verbal",
  standing_order: "Standing order",
  health_plan: "Health plan",
};

export default async function MedicationLogPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [logs, children, myRole, service] = await Promise.all([
    getMedicationLog(),
    getChildren(),
    getMyStaffRole(),
    getMyService(),
  ]);

  const staffMembers = service ? await getStaffMembers(service.id) : [];
  const isDirector = myRole === "director";

  const nowLocal = new Date().toLocaleString("sv-SE", { timeZone: "Australia/Sydney" }).slice(0, 16);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Medication log</h1>
      <p className="mt-1 text-sm text-ink/60">
        Required under ECSNR Regulation 93. Record every medication administration including
        dose, route, parent authorisation and a witness where possible.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      {/* ─── Log new administration ───────────────────────────────────────── */}
      <div className={`mt-6 ${cardClass} p-5`}>
        <h2 className="mb-4 text-lg font-semibold text-ink">Record administration</h2>
        <form action={logMedication} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink">Child</label>
              <select name="child_id" required className={inputClass}>
                <option value="">Select child…</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Date & time</label>
              <input
                type="datetime-local"
                name="administered_at"
                defaultValue={nowLocal}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink">Medication name</label>
              <input type="text" name="medication_name" required placeholder="e.g. Panadol" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Dose</label>
              <input type="text" name="dose" required placeholder="e.g. 5ml" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink">Route</label>
              <select name="route" required className={inputClass}>
                {Object.entries(ROUTE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Reason</label>
              <input type="text" name="reason" placeholder="e.g. fever" className={inputClass} />
            </div>
          </div>

          <fieldset className="rounded-xl border border-coral-light p-4">
            <legend className="px-1 text-sm font-medium text-ink">Parent authorisation</legend>
            <div className="mt-2 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink">Authorised?</label>
                <select name="parent_authorised" className={inputClass}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink">Method</label>
                <select name="authorisation_method" className={inputClass}>
                  <option value="">—</option>
                  {Object.entries(AUTH_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink">Authorised by</label>
                <input type="text" name="authorised_by_name" placeholder="Parent/guardian name" className={inputClass} />
              </div>
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink">Witness</label>
              <select name="witnessed_by_user_id" className={inputClass}>
                <option value="">No witness</option>
                {staffMembers.map((s) => (
                  <option key={s.user_id} value={s.user_id}>{s.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Next dose due</label>
              <input type="datetime-local" name="next_dose_due" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Observations after administration</label>
            <textarea name="observations_after" rows={2} className={inputClass} placeholder="Child's reaction, any side effects…" />
          </div>

          <div className="flex justify-end">
            <button type="submit" className={primaryButtonClass}>Save record</button>
          </div>
        </form>
      </div>

      {/* ─── Log history ──────────────────────────────────────────────────── */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-ink">Administration history</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-ink/50">No records yet.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const child = children.find((c) => c.id === log.child_id);
              const staff = staffMembers.find((s) => s.user_id === log.administered_by_user_id);
              const witness = log.witnessed_by_user_id
                ? staffMembers.find((s) => s.user_id === log.witnessed_by_user_id)
                : null;
              return (
                <div key={log.id} className={`${cardClass} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-ink">
                        {log.medication_name} · {log.dose} · {ROUTE_LABELS[log.route] ?? log.route}
                      </p>
                      <p className="mt-0.5 text-sm text-ink/60">
                        {child?.first_name ?? "Unknown child"} ·{" "}
                        {new Date(log.administered_at).toLocaleString("en-AU", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                        {staff ? ` · Given by ${staff.displayName}` : ""}
                      </p>
                      {log.reason && (
                        <p className="mt-1 text-sm text-ink/70">Reason: {log.reason}</p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        <span
                          className={`rounded-full px-2 py-0.5 font-medium ${
                            log.parent_authorised
                              ? "bg-sage-light text-sage-dark"
                              : "bg-coral-light text-coral-dark"
                          }`}
                        >
                          {log.parent_authorised ? "Parent authorised" : "Not authorised"}
                        </span>
                        {log.authorisation_method && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                            {AUTH_LABELS[log.authorisation_method]}
                          </span>
                        )}
                        {witness && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-800">
                            Witnessed by {witness.displayName}
                          </span>
                        )}
                      </div>
                      {log.observations_after && (
                        <p className="mt-1 text-sm text-ink/70">
                          After: {log.observations_after}
                        </p>
                      )}
                      {log.next_dose_due && (
                        <p className="mt-1 text-xs text-ink/50">
                          Next dose:{" "}
                          {new Date(log.next_dose_due).toLocaleString("en-AU", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                    </div>
                    {isDirector && (
                      <form action={deleteMedicationLog.bind(null, log.id)}>
                        <button type="submit" className="text-xs text-ink/30 hover:text-coral-dark">
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
