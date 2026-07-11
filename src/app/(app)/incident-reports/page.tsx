import { getChildIncidentReports, getStaffIncidentReports } from "@/lib/supabase/incidents";
import { getChildren } from "@/lib/supabase/children";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { inputClass, cardClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import {
  createChildIncidentReport,
  deleteChildIncidentReport,
  createStaffIncidentReport,
  deleteStaffIncidentReport,
  notifyParentOfIncident,
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
        Structured records under Regulation 87 of the Education and Care Services National
        Regulations 2011. Child incident records must be kept confidential until the child turns 25.
        Staff incident records are governed by your state WHS legislation.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      {/* ─── Mandatory Reporting Notice ─────────────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4">
        <p className="text-sm font-bold text-amber-900">NSW Mandatory Reporting Obligation</p>
        <p className="mt-1 text-xs text-amber-800">
          Under the <em>Children and Young Persons (Care and Protection) Act 1998</em> (NSW) s23,
          all educators are mandatory reporters. If you suspect a child is at risk of significant
          harm, you must report to the Child Protection Helpline — even if you are uncertain.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <a
            href="tel:132677"
            className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-500"
          >
            Child Protection Helpline: 13 26 77
          </a>
          <span className="text-xs text-amber-700">Available 24/7 · Do not wait until Monday</span>
        </div>
        <p className="mt-1.5 text-xs text-amber-700">
          Mandatory reporting is a personal legal obligation — it cannot be delegated. Failure to
          report when required is an offence. If you make a report in good faith, you have
          legislative protection even if the concern is not substantiated.
        </p>
      </div>

      {/* ─── Child Incident Report ───────────────────────────────────────────── */}
      <div className={`mt-6 p-5 ${cardClass}`}>
        <h2 className="font-display text-lg font-semibold text-ink">
          Children — incident / injury / trauma / illness
        </h2>
        <p className="mt-0.5 text-xs text-ink/50">
          Reg 87: complete within 24 hours · Keep confidential until the child turns 25 · Notify
          parents as soon as practicable
        </p>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-coral-dark">
            Record a new entry
          </summary>
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
              <label className="block text-sm font-medium text-ink/70">
                Date and time it occurred
              </label>
              <input name="occurred_at" type="datetime-local" required className={inputClass} />
            </div>
            <input name="location" type="text" placeholder="Location" className={inputClass} />
            <textarea
              name="description"
              rows={3}
              required
              placeholder="Circumstances of the incident/injury/trauma, or apparent symptoms of the illness. Be factual and specific — avoid opinion or interpretation."
              className={inputClass}
            />
            <textarea
              name="action_taken"
              rows={2}
              placeholder="Action taken (first aid administered, medication given, ambulance called)"
              className={inputClass}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-ink/50">Parent notified at</label>
                <input name="parent_notified_at" type="datetime-local" className={inputClass} />
              </div>
              <input
                name="parent_notification_method"
                type="text"
                placeholder="How (phone, in person…)"
                className={`${inputClass} mt-5`}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                name="nominated_supervisor_notified"
                className="h-4 w-4 rounded border-coral-light"
              />
              Nominated supervisor notified
            </label>
            <textarea
              name="monitoring_plan"
              rows={2}
              placeholder="Monitoring plan following treatment (if any)"
              className={inputClass}
            />
            <input
              name="witness_name"
              type="text"
              placeholder="Witness name (if any)"
              className={inputClass}
            />

            {/* ── Mandatory reporting assessment ─────────────────────── */}
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                Mandatory reporting assessment (NSW s23)
              </p>
              <p className="text-xs text-amber-700">
                Consider whether this incident suggests the child may be experiencing abuse,
                neglect, domestic violence exposure, or any other situation that could constitute
                "risk of significant harm." You must assess this for every entry.
              </p>
              <label className="flex items-start gap-2 text-sm text-amber-900">
                <input
                  type="checkbox"
                  name="possible_harm_indicator"
                  value="1"
                  className="mt-0.5 h-4 w-4 rounded border-amber-400 accent-amber-500"
                />
                <span>
                  <strong>This incident may indicate risk of significant harm</strong> — I need to
                  consider a mandatory report to the Child Protection Helpline (13 26 77)
                </span>
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm text-amber-900">
                  <input
                    type="checkbox"
                    name="mandatory_report_made"
                    value="1"
                    className="mt-0.5 h-4 w-4 rounded border-amber-400 accent-amber-500"
                  />
                  <span>
                    A mandatory report was made to the Child Protection Helpline (13 26 77)
                  </span>
                </label>
                <div>
                  <label className="block text-xs text-amber-700">
                    Date and time of report (if made)
                  </label>
                  <input
                    type="datetime-local"
                    name="mandatory_report_at"
                    className="mt-0.5 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm text-ink focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <p className="text-xs text-amber-600">
                If unsure whether to report, call the Helpline — they will advise you. Document
                your decision either way. Your obligation to report is personal and cannot be
                overridden by a supervisor or director.
              </p>
            </div>

            {/* ── Reg 176 regulatory authority notification ──────────── */}
            <div className="rounded-xl border border-coral-light bg-coral-light/20 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-ink/70">
                Regulatory authority notification (Reg 176)
              </p>
              <p className="text-xs text-ink/60">
                Reg 176 of the Education and Care Services National Regulations requires the
                approved provider to notify the regulatory authority as soon as practicable (and
                within 24 hours) of a{" "}
                <strong>serious incident</strong> — defined as: death, serious injury or illness,
                child missing/not collected, emergency services called, or similar. This applies
                even if the incident was minor internally.
              </p>
              <label className="flex items-start gap-2 text-sm text-ink/80">
                <input
                  type="checkbox"
                  name="regulatory_authority_notified"
                  value="1"
                  className="mt-0.5 h-4 w-4 rounded border-coral accent-coral"
                />
                <span>
                  <strong>This incident is or may be a serious incident (Reg 176)</strong> — the
                  regulatory authority was or will be notified
                </span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-ink/50">Date and time of notification</label>
                  <input
                    type="datetime-local"
                    name="regulatory_authority_notified_at"
                    className={`mt-0.5 ${inputClass}`}
                  />
                </div>
                <input
                  name="regulatory_authority_notification_method"
                  type="text"
                  placeholder="Method (phone, email, online portal)"
                  className={`${inputClass} mt-5`}
                />
              </div>
              <p className="text-xs text-ink/40">
                NSW: notify the NSW Regulatory Authority via the National Quality Agenda IT System
                (NQA ITS) or by phone on 1800 619 113. Retain a copy of all notifications.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                name="completed_by_name"
                type="text"
                placeholder="Completed by (name)"
                required
                className={inputClass}
              />
              <input
                name="completed_by_role"
                type="text"
                placeholder="Position/role"
                className={inputClass}
              />
            </div>
            <button type="submit" className={`w-full ${primaryButtonClass}`}>
              Save record
            </button>
          </form>
        </details>

        <ul className="mt-4 divide-y divide-coral-light">
          {childReports.length === 0 && (
            <p className="py-3 text-sm text-ink/50">No records yet.</p>
          )}
          {childReports.map((r) => {
            const child = children.find((c) => c.id === r.child_id);
            const hasHarmFlag = r.possible_harm_indicator;
            const reportMade = r.mandatory_report_made;
            const reg176 = r.regulatory_authority_notified;
            return (
              <li key={r.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-ink">
                        {RECORD_TYPE_LABELS[r.record_type]} —{" "}
                        {child?.first_name ?? "Unknown child"}
                      </p>
                      {hasHarmFlag && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            reportMade
                              ? "bg-sage-light text-sage-dark"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {reportMade ? "DCJ report made" : "⚑ Harm flagged"}
                        </span>
                      )}
                      {reg176 && (
                        <span className="rounded-full bg-coral-light px-2 py-0.5 text-[10px] font-bold uppercase text-coral-dark">
                          Reg 176 notified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink/50">
                      {new Date(r.occurred_at).toLocaleString("en-AU")}
                    </p>
                    <p className="mt-1 text-sm text-ink/80">{r.description}</p>
                    <p className="mt-1 text-xs text-ink/40">
                      {r.parent_notified_at
                        ? `Parent notified ${new Date(r.parent_notified_at).toLocaleString("en-AU")} via ${r.parent_notification_method ?? "unknown"}`
                        : "Parent not yet notified"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5 items-end">
                    <a href={`/incident-reports/${r.id}/notify`} className="text-xs text-coral-dark hover:underline">
                      Reg 176 form →
                    </a>
                    {!r.parent_notified_at && (
                      <form action={async (fd: FormData) => { await notifyParentOfIncident(fd); }}>
                        <input type="hidden" name="incident_id" value={r.id} />
                        <input type="hidden" name="method" value="in-app" />
                        <button type="submit" className="text-xs font-medium text-sage-dark hover:underline">
                          Notify parent
                        </button>
                      </form>
                    )}
                    {isDirector && (
                      <form action={deleteChildIncidentReport}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="text-xs text-coral-dark hover:underline">
                          Remove
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ─── Staff WHS Incident Report ───────────────────────────────────────── */}
      <div className={`mt-6 p-5 ${cardClass}`}>
        <h2 className="font-display text-lg font-semibold text-ink">Staff — workplace incident</h2>
        <div className="mt-2 rounded-xl border border-coral-light bg-coral-light/30 p-3 text-xs text-ink/70 space-y-1">
          <p className="font-semibold text-ink/80">WHS Notifiable Incidents (NSW Work Health and Safety Act 2011 s35)</p>
          <p>You must notify SafeWork NSW immediately (by fastest means, then in writing within 48 hours) if any of the following occur:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>The death of a person</li>
            <li>A serious injury or illness (immediate hospital treatment required, amputation, serious head/eye/burn/spinal/internal organ injury, serious infection, occupational disease)</li>
            <li>A dangerous incident — e.g. uncontrolled escape of substances, explosion, collapse of structure or plant, electric shock, uncontrolled fall from height</li>
          </ul>
          <div className="flex items-center gap-3 pt-1">
            <a href="tel:131050" className="rounded-full bg-coral-light border border-coral px-3 py-1 text-xs font-bold text-coral-dark hover:bg-coral/20">
              SafeWork NSW: 13 10 50
            </a>
            <span className="text-ink/50">Available 24/7 for notifiable incidents</span>
          </div>
          <p className="text-ink/50">
            This record does not notify SafeWork NSW — you must call them directly. Preserve the
            site and any physical evidence until SafeWork NSW says it is safe to disturb.
          </p>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-coral-dark">
            Record a new report
          </summary>
          <form action={createStaffIncidentReport} className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                name="staff_name"
                type="text"
                placeholder="Staff member's name"
                required
                className={inputClass}
              />
              <input
                name="staff_role"
                type="text"
                placeholder="Position/role"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/70">
                Date and time it occurred
              </label>
              <input name="occurred_at" type="datetime-local" required className={inputClass} />
            </div>
            <input name="location" type="text" placeholder="Location" className={inputClass} />
            <textarea
              name="description"
              rows={3}
              required
              placeholder="What happened — be factual and specific"
              className={inputClass}
            />
            <textarea
              name="injury_description"
              rows={2}
              placeholder="Description of any injury or illness"
              className={inputClass}
            />
            <div className="flex flex-wrap gap-4 text-sm text-ink/70">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="first_aid_provided"
                  className="h-4 w-4 rounded border-coral-light"
                />
                First aid provided
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="medical_treatment_sought"
                  className="h-4 w-4 rounded border-coral-light"
                />
                Medical treatment sought
              </label>
            </div>
            <label className="flex items-start gap-2 rounded-xl border border-coral bg-coral-light/20 p-3 text-sm text-coral-dark">
              <input
                type="checkbox"
                name="is_potentially_notifiable"
                className="mt-0.5 h-4 w-4 rounded border-coral accent-coral"
              />
              <span>
                <strong>This incident meets WHS notifiable incident criteria</strong> — I need to
                call SafeWork NSW (13 10 50) immediately and preserve the site
              </span>
            </label>
            <input
              name="witness_name"
              type="text"
              placeholder="Witness name (if any)"
              className={inputClass}
            />
            <textarea
              name="immediate_actions"
              rows={2}
              placeholder="Immediate actions taken"
              className={inputClass}
            />
            <textarea
              name="corrective_actions"
              rows={2}
              placeholder="Corrective actions / follow-up planned"
              className={inputClass}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="completed_by_name"
                type="text"
                placeholder="Completed by (name)"
                required
                className={inputClass}
              />
              <input
                name="completed_by_role"
                type="text"
                placeholder="Position/role"
                className={inputClass}
              />
            </div>
            <button type="submit" className={`w-full ${primaryButtonClass}`}>
              Save report
            </button>
          </form>
        </details>

        <ul className="mt-4 divide-y divide-coral-light">
          {staffReports.length === 0 && (
            <p className="py-3 text-sm text-ink/50">No reports yet.</p>
          )}
          {staffReports.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {r.staff_name}{" "}
                    {r.is_potentially_notifiable && (
                      <span className="rounded-full bg-coral-light px-2 py-0.5 text-[10px] font-bold text-coral-dark">
                        ⚠ Notifiable
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink/50">
                    {new Date(r.occurred_at).toLocaleString("en-AU")}
                  </p>
                  <p className="mt-1 text-sm text-ink/80">{r.description}</p>
                </div>
                {isDirector && (
                  <form action={deleteStaffIncidentReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="shrink-0 text-xs text-coral-dark hover:underline"
                    >
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
