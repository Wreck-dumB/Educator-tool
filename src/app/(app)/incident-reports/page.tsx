import { getChildIncidentReports, getStaffIncidentReports } from "@/lib/supabase/incidents";
import { getChildren } from "@/lib/supabase/children";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { inputClass, cardClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import {
  createChildIncidentReport,
  deleteChildIncidentReport,
  createStaffIncidentReport,
  deleteStaffIncidentReport,
} from "./actions";

const RECORD_TYPE_LABELS: Record<string, string> = {
  incident: "Incident",
  injury: "Injury",
  trauma: "Trauma",
  illness: "Illness",
};

export default async function IncidentReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [childReports, staffReports, children, myRole] = await Promise.all([
    getChildIncidentReports(),
    getStaffIncidentReports(),
    getChildren(),
    getMyStaffRole(),
  ]);
  const isDirector = myRole === "director";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Incident reports</h1>
      <p className="mt-1 text-sm text-ink/60">
        Structured records, not AI-drafted — children&apos;s incidents fall under Regulation 87 of the
        National Regulations (record within 24 hours, keep confidential until the child turns 25);
        staff incidents sit under your state&apos;s WHS law, a separate regime with its own notifiable-
        incident obligations.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      {/* Children's Incident, Injury, Trauma and Illness Record */}
      <div className={`mt-6 p-5 ${cardClass}`}>
        <h2 className="font-display text-lg font-semibold text-ink">Children — incident/injury/trauma/illness</h2>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-coral-dark">Record a new entry</summary>
          <form action={createChildIncidentReport} className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink/70">Child</label>
                <select name="child_id" required className={inputClass}>
                  <option value="">Select…</option>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70">Type</label>
                <select name="record_type" required defaultValue="incident" className={inputClass}>
                  {Object.entries(RECORD_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/70">Date and time it occurred</label>
              <input name="occurred_at" type="datetime-local" required className={inputClass} />
            </div>
            <input name="location" type="text" placeholder="Location" className={inputClass} />
            <textarea
              name="description"
              rows={3}
              required
              placeholder="Circumstances of the incident/injury/trauma, or apparent symptoms of the illness"
              className={inputClass}
            />
            <textarea
              name="action_taken"
              rows={2}
              placeholder="Action taken (first aid, medication administered)"
              className={inputClass}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-ink/50">Parent notified at</label>
                <input name="parent_notified_at" type="datetime-local" className={inputClass} />
              </div>
              <input name="parent_notification_method" type="text" placeholder="How (phone, in person…)" className={`${inputClass} mt-5`} />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input type="checkbox" name="nominated_supervisor_notified" className="h-4 w-4 rounded border-coral-light" />
              Nominated supervisor notified
            </label>
            <textarea name="monitoring_plan" rows={2} placeholder="Monitoring plan following treatment (if any)" className={inputClass} />
            <input name="witness_name" type="text" placeholder="Witness name (if any)" className={inputClass} />
            <div className="grid grid-cols-2 gap-3">
              <input name="completed_by_name" type="text" placeholder="Completed by (name)" required className={inputClass} />
              <input name="completed_by_role" type="text" placeholder="Position/role" className={inputClass} />
            </div>
            <button type="submit" className={`w-full ${primaryButtonClass}`}>
              Save record
            </button>
          </form>
        </details>

        <ul className="mt-4 divide-y divide-coral-light">
          {childReports.length === 0 && <p className="py-3 text-sm text-ink/50">No records yet.</p>}
          {childReports.map((r) => {
            const child = children.find((c) => c.id === r.child_id);
            return (
              <li key={r.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {RECORD_TYPE_LABELS[r.record_type]} — {child?.first_name ?? "Unknown child"}
                    </p>
                    <p className="text-xs text-ink/50">{new Date(r.occurred_at).toLocaleString()}</p>
                    <p className="mt-1 text-sm text-ink/80">{r.description}</p>
                  </div>
                  {isDirector && (
                    <form action={deleteChildIncidentReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="shrink-0 text-xs text-coral-dark hover:underline">
                        Remove
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Staff workplace incident report */}
      <div className={`mt-6 p-5 ${cardClass}`}>
        <h2 className="font-display text-lg font-semibold text-ink">Staff — workplace incident</h2>
        <p className="mt-1 text-xs text-amber-dark">
          Deaths, serious injuries/illnesses, and dangerous incidents are legally &ldquo;notifiable&rdquo;
          and require immediate notification to your state/territory WHS regulator — this checkbox is a
          prompt to check that yourself, it does not submit a notification for you.
        </p>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-coral-dark">Record a new report</summary>
          <form action={createStaffIncidentReport} className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input name="staff_name" type="text" placeholder="Staff member's name" required className={inputClass} />
              <input name="staff_role" type="text" placeholder="Position/role" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/70">Date and time it occurred</label>
              <input name="occurred_at" type="datetime-local" required className={inputClass} />
            </div>
            <input name="location" type="text" placeholder="Location" className={inputClass} />
            <textarea name="description" rows={3} required placeholder="What happened" className={inputClass} />
            <textarea name="injury_description" rows={2} placeholder="Description of any injury" className={inputClass} />
            <div className="flex flex-wrap gap-4 text-sm text-ink/70">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="first_aid_provided" className="h-4 w-4 rounded border-coral-light" />
                First aid provided
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="medical_treatment_sought" className="h-4 w-4 rounded border-coral-light" />
                Medical treatment sought
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="is_potentially_notifiable" className="h-4 w-4 rounded border-coral-light" />
                Potentially notifiable to WHS regulator
              </label>
            </div>
            <input name="witness_name" type="text" placeholder="Witness name (if any)" className={inputClass} />
            <textarea name="immediate_actions" rows={2} placeholder="Immediate actions taken" className={inputClass} />
            <textarea name="corrective_actions" rows={2} placeholder="Corrective actions / follow-up" className={inputClass} />
            <div className="grid grid-cols-2 gap-3">
              <input name="completed_by_name" type="text" placeholder="Completed by (name)" required className={inputClass} />
              <input name="completed_by_role" type="text" placeholder="Position/role" className={inputClass} />
            </div>
            <button type="submit" className={`w-full ${primaryButtonClass}`}>
              Save report
            </button>
          </form>
        </details>

        <ul className="mt-4 divide-y divide-coral-light">
          {staffReports.length === 0 && <p className="py-3 text-sm text-ink/50">No reports yet.</p>}
          {staffReports.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {r.staff_name} {r.is_potentially_notifiable && <span className="text-coral-dark">⚠ potentially notifiable</span>}
                  </p>
                  <p className="text-xs text-ink/50">{new Date(r.occurred_at).toLocaleString()}</p>
                  <p className="mt-1 text-sm text-ink/80">{r.description}</p>
                </div>
                {isDirector && (
                  <form action={deleteStaffIncidentReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="shrink-0 text-xs text-coral-dark hover:underline">
                      Remove
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
