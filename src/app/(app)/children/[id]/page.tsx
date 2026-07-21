import { notFound } from "next/navigation";
import Link from "next/link";
import { getChild, getChildInvites, getChildContacts } from "@/lib/supabase/children";
import {
  updateChild,
  deleteChild,
  createChildInvite,
  revokeChildInvite,
  removeFamilyAccess,
  updateChildEnrolment,
  updateEnrolmentEndDate,
  createChildContact,
  deleteChildContact,
  setAttendanceDays,
  updateImmunisationStatus,
} from "@/app/(app)/children/actions";
import { createClient } from "@/lib/supabase/server";
import { getObservations } from "@/lib/supabase/observations";
import ObservationList from "@/components/ObservationList";
import { getRooms } from "@/lib/supabase/rooms";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { assignChildToRoom } from "@/app/(app)/rooms/actions";
import { inputClass, cardClass, primaryButtonClass, secondaryButtonClass, errorBannerClass } from "@/lib/ui";
import PrintButton from "@/components/PrintButton";
import { logAuditEvent } from "@/lib/supabase/auditLog";
import { getDevelopmentalMilestones } from "@/lib/supabase/milestones";
import MilestoneObservations from "./MilestoneObservations";

const AUTHORISATION_LABELS: Record<string, string> = {
  is_parent_guardian: "Parent/guardian",
  is_emergency_contact: "Emergency contact",
  is_authorised_nominee: "Authorised pickup",
  can_consent_medical_treatment: "Medical treatment consent",
  can_authorise_medication: "Medication consent",
  can_authorise_excursions: "Excursion consent",
};

const INVITE_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Joined",
  expired: "Expired",
  revoked: "Revoked",
};

export default async function ChildDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const child = await getChild(id);

  if (!child) notFound();

  const supabase = await createClient();
  const [observations, invites, contacts, rooms, myRole, { data: attendanceDays }, milestones, { data: milestoneObs }] = await Promise.all([
    getObservations(id),
    getChildInvites(id),
    getChildContacts(id),
    getRooms(),
    getMyStaffRole(),
    supabase.from("child_attendance_days").select("day_of_week, session_type").eq("child_id", id),
    getDevelopmentalMilestones(),
    supabase.from("child_milestone_observations").select("*").eq("child_id", id).order("observed_at", { ascending: false }),
  ]);
  const canManage = myRole === "director" || myRole === "2ic";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Log access to this child's detailed record (fire and forget)
  void logAuditEvent("view_child_record", {
    type: "child",
    id: child.id,
    label: child.first_name,
  });

  return (
    <div className="mx-auto max-w-2xl print:max-w-none">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <h1 className="font-display text-3xl font-semibold text-coral-dark">🧒 {child.first_name}</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/children/${child.id}/support`}
            className="rounded-full border border-coral-light px-3 py-1.5 text-xs font-semibold text-coral-dark hover:bg-coral-light transition-colors"
          >
            Support →
          </Link>
          <Link
            href={`/children/${child.id}/portfolio`}
            className="rounded-full border border-sage-light px-3 py-1.5 text-xs font-semibold text-sage-dark hover:bg-sage-light transition-colors"
          >
            Portfolio →
          </Link>
          <PrintButton />
        </div>
      </div>

      {error && <p className={errorBannerClass}>{error}</p>}

      <div className={`mt-6 p-5 ${cardClass}`}>
        <form action={updateChild} className="space-y-4">
          <input type="hidden" name="id" value={child.id} />
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-ink/70">
              First name
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              required
              defaultValue={child.first_name}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-ink/70">
              Date of birth
            </label>
            <input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              defaultValue={child.date_of_birth ?? ""}
              className={inputClass}
            />
          </div>
          {rooms.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-ink/70">Room</label>
              <form action={assignChildToRoom} className="mt-1 flex gap-2">
                <input type="hidden" name="child_id" value={child.id} />
                <select
                  name="room_id"
                  defaultValue={child.room_id ?? ""}
                  className={`${inputClass} mt-0 flex-1`}
                >
                  <option value="">— Unassigned —</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <button type="submit" className="mt-1 shrink-0 rounded-full bg-sage px-3 py-2 text-xs font-semibold text-white hover:bg-sage-dark">
                  Save
                </button>
              </form>
            </div>
          )}
          <div>
            <label htmlFor="current_interests" className="block text-sm font-medium text-ink/70">
              Current interests
            </label>
            <input
              id="current_interests"
              name="current_interests"
              type="text"
              defaultValue={child.current_interests ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="additional_needs" className="block text-sm font-medium text-ink/70">
              Additional needs
            </label>
            <textarea
              id="additional_needs"
              name="additional_needs"
              rows={2}
              defaultValue={child.additional_needs ?? ""}
              placeholder="e.g. uses a wheelchair, sensory sensitivity to loud noise, recent family change at home"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-ink/50">
              Any physical, emotional, disability, neurodiversity, family, environmental, or legal
              needs/constraints worth the generator knowing about, to adapt activities respectfully.
            </p>
          </div>
          <button type="submit" className={`w-full ${primaryButtonClass}`}>
            Save changes
          </button>
        </form>

        {/* Data retention notice */}
        {(() => {
          if (!child.date_of_birth) return (
            <p className="mt-3 text-xs text-ink/40 border-t border-ink/10 pt-3">
              <strong>Record retention:</strong> Incident reports must be kept confidential until
              the child turns 25 (Regulation 87). Add a date of birth to calculate the exact date.
            </p>
          );
          const retainUntil = new Date(child.date_of_birth);
          retainUntil.setFullYear(retainUntil.getFullYear() + 25);
          const isPast = retainUntil < new Date();
          return (
            <p className={`mt-3 text-xs border-t border-ink/10 pt-3 ${isPast ? "text-amber-700 font-medium" : "text-ink/40"}`}>
              <strong>Incident record retention:</strong> Regulation 87 requires records to be kept
              confidential until{" "}
              <strong>{retainUntil.toLocaleDateString("en-AU")}</strong>
              {isPast ? " — this date has passed; records may now be archived or destroyed." : "."}
            </p>
          );
        })()}
      </div>

      <div className={`mt-6 p-5 print:border print:border-black print:bg-white ${cardClass}`}>
        <h2 className="font-display text-sm font-semibold text-ink print:text-black">
          Enrolment &amp; emergency information
        </h2>
        <p className="mt-1 text-xs text-ink/50 print:hidden">
          The fields the National Regulations require services to keep on file (Reg 161&ndash;162) &mdash;
          kept here so it&apos;s on hand in an emergency, not buried in a paper file.
        </p>
        <form action={updateChildEnrolment} className="mt-4 space-y-4 print:hidden">
          <input type="hidden" name="id" value={child.id} />
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-ink/70">
              Address
            </label>
            <input id="address" name="address" type="text" defaultValue={child.address ?? ""} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="medical_practice_name" className="block text-sm font-medium text-ink/70">
                Doctor / medical practice
              </label>
              <input
                id="medical_practice_name"
                name="medical_practice_name"
                type="text"
                defaultValue={child.medical_practice_name ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="medical_practice_phone" className="block text-sm font-medium text-ink/70">
                Practice phone
              </label>
              <input
                id="medical_practice_phone"
                name="medical_practice_phone"
                type="text"
                defaultValue={child.medical_practice_phone ?? ""}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor="medicare_number" className="block text-sm font-medium text-ink/70">
              Medicare number
            </label>
            <input
              id="medicare_number"
              name="medicare_number"
              type="text"
              defaultValue={child.medicare_number ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="medical_conditions" className="block text-sm font-medium text-ink/70">
              Medical conditions / specific healthcare needs
            </label>
            <textarea
              id="medical_conditions"
              name="medical_conditions"
              rows={2}
              defaultValue={child.medical_conditions ?? ""}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              name="is_anaphylaxis_risk"
              defaultChecked={child.is_anaphylaxis_risk}
              className="h-4 w-4 rounded border-coral-light"
            />
            Diagnosed as at risk of anaphylaxis
          </label>
          <div>
            <label htmlFor="medical_management_plan" className="block text-sm font-medium text-ink/70">
              Medical management / risk minimisation plan
            </label>
            <textarea
              id="medical_management_plan"
              name="medical_management_plan"
              rows={2}
              placeholder="e.g. EpiPen location, asthma action plan summary"
              defaultValue={child.medical_management_plan ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="dietary_restrictions" className="block text-sm font-medium text-ink/70">
              Dietary restrictions
            </label>
            <input
              id="dietary_restrictions"
              name="dietary_restrictions"
              type="text"
              defaultValue={child.dietary_restrictions ?? ""}
              className={inputClass}
            />
          </div>
          <button type="submit" className={`w-full ${primaryButtonClass}`}>
            Save enrolment details
          </button>
        </form>

        <div className="hidden space-y-1 text-sm print:block print:text-black">
          {child.address && <p>Address: {child.address}</p>}
          {child.medical_practice_name && (
            <p>
              Doctor: {child.medical_practice_name} {child.medical_practice_phone}
            </p>
          )}
          {child.medicare_number && <p>Medicare: {child.medicare_number}</p>}
          {child.medical_conditions && <p>Medical conditions: {child.medical_conditions}</p>}
          {child.is_anaphylaxis_risk && <p className="font-semibold">⚠ Anaphylaxis risk</p>}
          {child.medical_management_plan && <p>Management plan: {child.medical_management_plan}</p>}
          {child.dietary_restrictions && <p>Dietary restrictions: {child.dietary_restrictions}</p>}
          {child.immunisation_status && <p>Immunisation: {child.immunisation_status}</p>}
        </div>
      </div>

      {/* Immunisation tracking (No Jab No Play compliance) */}
      <div className={`mt-6 p-5 ${cardClass} ${
        child.immunisation_status === "not_sighted" || child.immunisation_status === "overdue"
          ? "border-coral/40 bg-coral/5"
          : child.immunisation_status === "up_to_date"
          ? "border-sage-dark/30 bg-sage-light/30"
          : ""
      }`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-semibold text-ink">Immunisation status</h2>
          {child.immunisation_status === "not_sighted" && (
            <span className="rounded-full bg-coral/15 px-2 py-0.5 text-xs font-semibold text-coral-dark">Action required</span>
          )}
          {child.immunisation_status === "overdue" && (
            <span className="rounded-full bg-coral px-2 py-0.5 text-xs font-semibold text-white">Overdue</span>
          )}
          {child.immunisation_status === "up_to_date" && (
            <span className="rounded-full bg-sage-dark/20 px-2 py-0.5 text-xs font-semibold text-sage-dark">Up to date</span>
          )}
        </div>
        <p className="text-xs text-ink/50 mb-4">
          Under No Jab No Play, services must sight a current AIR Immunisation History Statement from myGov
          before attendance. Medical exemptions and approved catch-up schedules are accepted alternatives.
        </p>
        <form action={async (fd: FormData) => { await updateImmunisationStatus(fd); }} className="space-y-3">
          <input type="hidden" name="child_id" value={child.id} />
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1">Current status</label>
            <select name="immunisation_status" defaultValue={child.immunisation_status ?? "not_sighted"} className={inputClass}>
              <option value="not_sighted">Not yet sighted</option>
              <option value="up_to_date">Up to date — AIR statement sighted</option>
              <option value="approved_catch_up">Approved catch-up schedule in progress</option>
              <option value="medical_exemption">Medical exemption (ACIR/GP certified)</option>
              <option value="overdue">Overdue — statement needs renewal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1">Date statement last sighted</label>
            <input
              type="date"
              name="immunisation_checked_date"
              defaultValue={child.immunisation_checked_date ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1">Notes (optional)</label>
            <input
              type="text"
              name="immunisation_notes"
              defaultValue={child.immunisation_notes ?? ""}
              placeholder="e.g. Medical exemption ref #, catch-up plan details"
              className={inputClass}
            />
          </div>
          <button type="submit" className={secondaryButtonClass}>Update immunisation record</button>
        </form>
      </div>

      <div className={`mt-6 p-5 print:border print:border-black print:bg-white ${cardClass}`}>
        <h2 className="font-display text-sm font-semibold text-ink print:text-black">Contacts &amp; authorisations</h2>
        <ul className="mt-3 divide-y divide-coral-light">
          {contacts.map((contact) => (
            <li key={contact.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink print:text-black">
                    {contact.full_name} {contact.relationship && <span className="text-ink/50">({contact.relationship})</span>}
                  </p>
                  <p className="text-xs text-ink/60 print:text-black">
                    {[contact.phone, contact.email].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.entries(AUTHORISATION_LABELS)
                      .filter(([key]) => contact[key as keyof typeof contact])
                      .map(([key, label]) => (
                        <span
                          key={key}
                          className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark print:border print:border-black print:bg-white print:text-black"
                        >
                          {label}
                        </span>
                      ))}
                  </div>
                </div>
                {canManage && (
                  <form action={deleteChildContact} className="print:hidden">
                    <input type="hidden" name="contact_id" value={contact.id} />
                    <input type="hidden" name="child_id" value={child.id} />
                    <button type="submit" className="shrink-0 text-xs text-coral-dark hover:underline">
                      Remove
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>

        <details className="mt-4 print:hidden">
          <summary className="cursor-pointer text-sm font-medium text-coral-dark">Add a contact</summary>
          <form action={createChildContact} className="mt-3 space-y-3">
            <input type="hidden" name="child_id" value={child.id} />
            <div className="grid grid-cols-2 gap-3">
              <input name="full_name" type="text" placeholder="Full name" required className={inputClass} />
              <input name="relationship" type="text" placeholder="Relationship, e.g. Mother" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input name="phone" type="text" placeholder="Phone" className={inputClass} />
              <input name="email" type="email" placeholder="Email" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-ink/70">
              {Object.entries(AUTHORISATION_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input type="checkbox" name={key} className="h-4 w-4 rounded border-coral-light" />
                  {label}
                </label>
              ))}
            </div>
            <button type="submit" className={secondaryButtonClass}>
              Add contact
            </button>
          </form>
        </details>
      </div>

      {/* Enrolment status / end date */}
      {canManage && (
        <div className={`mt-6 print:hidden ${cardClass}`}>
          <div className="border-b border-coral-light px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-ink">Enrolment status</h2>
            <p className="mt-0.5 text-xs text-ink/50">
              Record when {child.first_name} left the service. Under Australian Privacy Act APP 12
              and Reg 175, enrolment records must be kept for at least 3 years after enrolment ends.
              After that period expires, consider de-identifying or archiving this child&apos;s data.
            </p>
          </div>
          <form action={updateEnrolmentEndDate} className="px-4 py-4">
            <input type="hidden" name="id" value={child.id} />
            <div>
              <label className="block text-sm font-medium text-ink/70">
                Enrolment ended (leave blank if currently enrolled)
              </label>
              <input
                type="date"
                name="enrolment_ended_at"
                defaultValue={child.enrolment_ended_at ? child.enrolment_ended_at.substring(0, 10) : ""}
                max={new Date().toISOString().substring(0, 10)}
                className={`${inputClass} mt-1 w-auto`}
              />
            </div>
            {child.enrolment_ended_at && (() => {
              const endDate = new Date(child.enrolment_ended_at);
              const retentionDate = new Date(endDate);
              retentionDate.setFullYear(retentionDate.getFullYear() + 3);
              const now = new Date();
              const pastRetention = now > retentionDate;
              return (
                <p className={`mt-2 text-xs ${pastRetention ? "font-semibold text-coral-dark" : "text-ink/50"}`}>
                  {pastRetention
                    ? `Retention period expired ${retentionDate.toLocaleDateString("en-AU")} — data may now be de-identified or archived.`
                    : `Minimum retention until: ${retentionDate.toLocaleDateString("en-AU")}`}
                </p>
              );
            })()}
            <button type="submit" className="mt-3 rounded-full bg-coral-light px-4 py-1.5 text-xs font-semibold text-coral-dark hover:bg-coral/20">
              Save enrolment status
            </button>
          </form>
        </div>
      )}

      {/* Enrolled days */}
      <div className={`mt-6 print:hidden ${cardClass}`}>
        <div className="border-b border-coral-light px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">Enrolled days</h2>
          <p className="mt-0.5 text-xs text-ink/50">Which days {child.first_name} normally attends — used by the Day Plan to build the daily roster.</p>
        </div>
        <form action={setAttendanceDays} className="px-4 py-4">
          <input type="hidden" name="child_id" value={child.id} />
          <div className="space-y-2">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day, i) => {
              const existing = (attendanceDays ?? []).find((d) => d.day_of_week === i);
              return (
                <div key={day} className="flex items-center justify-between gap-3">
                  <span className="w-28 text-sm text-ink/80">{day}</span>
                  <select
                    name={`day_${i}`}
                    defaultValue={existing?.session_type ?? ""}
                    className="flex-1 rounded-lg border border-coral-light bg-white px-2 py-1.5 text-xs text-ink focus:border-coral focus:outline-none"
                  >
                    <option value="">Not enrolled</option>
                    <option value="full_day">Full day</option>
                    <option value="morning">Morning only</option>
                    <option value="afternoon">Afternoon only</option>
                  </select>
                </div>
              );
            })}
          </div>
          <button type="submit" className="mt-4 rounded-full bg-coral-light px-4 py-1.5 text-xs font-semibold text-coral-dark hover:bg-coral/20">
            Save enrolled days
          </button>
        </form>
      </div>

      <div className={`mt-6 print:hidden ${cardClass}`}>
        <div className="border-b border-coral-light px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">Family access</h2>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-ink/60">
            Invite {child.first_name}&apos;s family to a linked view where they can see what you
            explicitly choose to share, message you, and upload documents. You can remove a
            family&apos;s access at any time (e.g. if they leave the centre) — it only revokes
            their login and keeps all of {child.first_name}&apos;s records.
          </p>
          <form action={createChildInvite} className="mt-3 flex gap-2">
            <input type="hidden" name="child_id" value={child.id} />
            <input
              type="email"
              name="invited_email"
              placeholder="family@example.com"
              required
              className={`${inputClass} mt-0 flex-1`}
            />
            <button type="submit" className={secondaryButtonClass}>
              Invite
            </button>
          </form>

          {invites.length > 0 && (
            <ul className="mt-4 divide-y divide-coral-light">
              {invites.map((invite) => (
                <li key={invite.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink/80">{invite.invited_email}</p>
                    {invite.status === "pending" && (
                      <p className="truncate text-xs text-ink/40">
                        {siteUrl}/parent/accept-invite/{invite.token}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs font-medium text-ink/50">
                      {INVITE_STATUS_LABELS[invite.status] ?? invite.status}
                    </span>
                    {invite.status === "pending" && (
                      <form action={revokeChildInvite}>
                        <input type="hidden" name="invite_id" value={invite.id} />
                        <input type="hidden" name="child_id" value={child.id} />
                        <button type="submit" className="text-xs font-medium text-coral-dark hover:underline">
                          Revoke
                        </button>
                      </form>
                    )}
                    {invite.status === "accepted" && (
                      <form action={removeFamilyAccess}>
                        <input type="hidden" name="invite_id" value={invite.id} />
                        <input type="hidden" name="child_id" value={child.id} />
                        <button type="submit" className="text-xs font-medium text-coral-dark hover:underline">
                          Remove access
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 print:hidden">
        {observations.length === 0 ? (
          <div className={`p-5 ${cardClass}`}>
            <p className="text-sm text-ink/50">
              Logged observations for {child.first_name} will appear here once you start saving
              them from generated activities.
            </p>
          </div>
        ) : (
          <ObservationList
            observations={observations}
            title="Observations"
            childContextMap={new Map([[child.id, { id: child.id, interests: child.current_interests }]])}
          />
        )}
      </div>

      {/* Milestone observations */}
      <div className={`mt-6 p-5 ${cardClass} print:hidden`}>
        <h2 className="font-display text-lg font-semibold text-ink mb-1">Milestone observations</h2>
        <p className="text-xs text-ink/50 mb-4">
          Record developmental milestones you&apos;ve observed for {child.first_name}. Supports transition
          statement writing and family communication.{" "}
          <a href="/transitions" className="text-coral-dark hover:underline">
            Write a transition statement →
          </a>
        </p>
        <MilestoneObservations
          childId={child.id}
          initialObservations={(milestoneObs ?? []) as Parameters<typeof MilestoneObservations>[0]["initialObservations"]}
          milestones={milestones}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-coral-light bg-coral-light/20 p-4 print:hidden">
        <h2 className="font-display text-sm font-semibold text-coral-dark">Permanently delete</h2>
        <p className="mt-1 text-xs text-ink/60">
          If {child.first_name} has left the centre, use <strong>Enrolment status</strong> above
          instead — that keeps the records you&apos;re legally required to retain. Only permanently
          delete a profile created by mistake. This erases {child.first_name}&apos;s observations,
          incidents, and medical history and cannot be undone.
        </p>
        <form action={deleteChild} className="mt-3">
          <input type="hidden" name="id" value={child.id} />
          <button type="submit" className="text-xs font-medium text-coral-dark hover:underline">
            Permanently delete this profile and all its records
          </button>
        </form>
      </div>
    </div>
  );
}
