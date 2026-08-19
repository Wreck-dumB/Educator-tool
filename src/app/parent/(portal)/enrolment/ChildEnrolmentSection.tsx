import { getChildContacts } from "@/lib/supabase/children";
import { getEnrolmentSubmissions, getEnrolmentDocuments, getContactSubmissions } from "@/lib/supabase/enrolmentSubmissions";
import { cardClass, inputClass, secondaryButtonClass } from "@/lib/ui";
import { AUTHORISATION_LABELS } from "@/lib/childContactLabels";
import SubmitButton from "@/components/SubmitButton";
import {
  submitEnrolmentUpdate,
  deleteOwnPendingEnrolmentSubmission,
  uploadEnrolmentDocument,
  deleteOwnPendingEnrolmentDocument,
  submitChildContactChange,
  deleteOwnPendingContactSubmission,
} from "./actions";
import type { ChildContact, ChildProfile } from "@/lib/types/domain";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  immunisation_statement: "Immunisation history statement",
  medical_management_plan: "Medical management / action plan",
  court_order: "Court order / parenting order",
  enrolment_form: "Enrolment form",
  other: "Other",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "text-amber-dark bg-amber-light",
  approved: "text-sage-dark bg-sage-light",
  rejected: "text-coral-dark bg-coral-light",
};

const STATUS_TEXT: Record<string, string> = {
  pending: "Awaiting review",
  approved: "Approved",
  rejected: "Not approved",
};

export default async function ChildEnrolmentSection({ child }: { child: ChildProfile }) {
  const [contacts, submissions, documents, contactSubmissions] = await Promise.all([
    getChildContacts(child.id),
    getEnrolmentSubmissions(child.id),
    getEnrolmentDocuments(child.id),
    getContactSubmissions(child.id),
  ]);

  return (
    <div className="space-y-4 border-t border-coral-light pt-6 first:border-t-0 first:pt-0">
      <h2 className="font-display text-xl font-semibold text-ink">🧒 {child.first_name}</h2>

      {/* Profile / health update form */}
      <div className={`p-5 ${cardClass}`}>
        <h3 className="font-display text-sm font-semibold text-ink">Propose a profile/health update</h3>
        <p className="mt-1 text-xs text-ink/50">
          Pre-filled with what&apos;s currently on file — change what needs updating and submit.
        </p>
        <form action={submitEnrolmentUpdate} className="mt-4 space-y-4">
          <input type="hidden" name="child_id" value={child.id} />
          <div>
            <label className="block text-sm font-medium text-ink/70">First name</label>
            <input name="first_name" type="text" required defaultValue={child.first_name} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/70">Date of birth</label>
            <input name="date_of_birth" type="date" defaultValue={child.date_of_birth ?? ""} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/70">Current interests</label>
            <input name="current_interests" type="text" defaultValue={child.current_interests ?? ""} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/70">Additional needs</label>
            <textarea name="additional_needs" rows={2} defaultValue={child.additional_needs ?? ""} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/70">Home address</label>
            <input name="address" type="text" defaultValue={child.address ?? ""} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink/70">Doctor / medical practice</label>
              <input name="medical_practice_name" type="text" defaultValue={child.medical_practice_name ?? ""} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/70">Practice phone</label>
              <input name="medical_practice_phone" type="text" defaultValue={child.medical_practice_phone ?? ""} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/70">Medicare number</label>
            <input name="medicare_number" type="text" defaultValue={child.medicare_number ?? ""} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/70">Medical conditions / specific healthcare needs</label>
            <textarea name="medical_conditions" rows={2} defaultValue={child.medical_conditions ?? ""} className={inputClass} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input type="checkbox" name="is_anaphylaxis_risk" defaultChecked={child.is_anaphylaxis_risk} className="h-4 w-4 rounded border-coral-light" />
            Diagnosed as at risk of anaphylaxis
          </label>
          <div>
            <label className="block text-sm font-medium text-ink/70">Medical management / risk minimisation plan</label>
            <textarea name="medical_management_plan" rows={2} defaultValue={child.medical_management_plan ?? ""} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/70">Dietary restrictions</label>
            <input name="dietary_restrictions" type="text" defaultValue={child.dietary_restrictions ?? ""} className={inputClass} />
          </div>
          <p className="text-xs text-ink/40">
            Note: immunisation status isn&apos;t set here — upload your AIR immunisation history
            statement below and the service will confirm it on file.
          </p>
          <SubmitButton pendingText="Submitting…" className={`w-full ${secondaryButtonClass}`}>
            Submit for review
          </SubmitButton>
        </form>
      </div>

      {submissions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink/50">Your submitted updates</h3>
          {submissions.map((s) => (
            <div key={s.id} className={`p-4 ${cardClass}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[s.status]}`}>
                  {STATUS_TEXT[s.status]}
                </span>
                <span className="text-xs text-ink/40">{new Date(s.created_at).toLocaleDateString("en-AU")}</span>
              </div>
              {s.rejection_reason && <p className="mt-2 text-xs text-ink/60">Reason: {s.rejection_reason}</p>}
              {s.status === "pending" && (
                <form action={deleteOwnPendingEnrolmentSubmission} className="mt-2">
                  <input type="hidden" name="submission_id" value={s.id} />
                  <button type="submit" className="text-xs text-ink/30 hover:text-coral-dark">Cancel</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Documents */}
      <div className={`p-5 ${cardClass}`}>
        <h3 className="font-display text-sm font-semibold text-ink">Upload a document</h3>
        <p className="mt-1 text-xs text-ink/50">
          Immunisation statement, medical management plan, court orders, or other enrolment
          paperwork. PDF, JPEG, PNG, WebP, or HEIC, up to 5&nbsp;MB.
        </p>
        <form action={uploadEnrolmentDocument} className="mt-3 space-y-3">
          <input type="hidden" name="child_id" value={child.id} />
          <select name="document_type" required className={inputClass}>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic" required className={inputClass} />
          <input name="notes" type="text" placeholder="Notes (optional)" className={inputClass} />
          <SubmitButton pendingText="Uploading…" className={secondaryButtonClass}>
            Upload for review
          </SubmitButton>
        </form>
      </div>

      {documents.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink/50">Your uploaded documents</h3>
          {documents.map((d) => (
            <div key={d.id} className={`p-4 ${cardClass}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-ink/80">{DOCUMENT_TYPE_LABELS[d.document_type] ?? d.document_type}</p>
                  <p className="text-xs text-ink/40">{d.original_filename}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[d.status]}`}>
                  {STATUS_TEXT[d.status]}
                </span>
              </div>
              {d.rejection_reason && <p className="mt-2 text-xs text-ink/60">Reason: {d.rejection_reason}</p>}
              {d.status === "pending" && (
                <form action={deleteOwnPendingEnrolmentDocument} className="mt-2">
                  <input type="hidden" name="document_id" value={d.id} />
                  <button type="submit" className="text-xs text-ink/30 hover:text-coral-dark">Cancel</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Emergency / authorised-pickup contacts */}
      <div className={`p-5 ${cardClass}`}>
        <h3 className="font-display text-sm font-semibold text-ink">Emergency &amp; authorised-pickup contacts</h3>
        <p className="mt-1 text-xs text-ink/50">Currently on file:</p>
        <ul className="mt-2 divide-y divide-coral-light">
          {contacts.map((contact: ChildContact) => (
            <li key={contact.id} className="py-3">
              <p className="text-sm font-medium text-ink">
                {contact.full_name} {contact.relationship && <span className="text-ink/50">({contact.relationship})</span>}
              </p>
              <p className="text-xs text-ink/60">{[contact.phone, contact.email].filter(Boolean).join(" · ")}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.entries(AUTHORISATION_LABELS)
                  .filter(([key]) => contact[key as keyof typeof contact])
                  .map(([key, label]) => (
                    <span key={key} className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark">
                      {label}
                    </span>
                  ))}
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-coral-dark">Propose an edit or removal</summary>
                <form action={submitChildContactChange} className="mt-2 space-y-2">
                  <input type="hidden" name="child_id" value={child.id} />
                  <input type="hidden" name="existing_contact_id" value={contact.id} />
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1 text-xs text-ink/70">
                      <input type="radio" name="action" value="update" defaultChecked /> Edit details
                    </label>
                    <label className="flex items-center gap-1 text-xs text-ink/70">
                      <input type="radio" name="action" value="remove" /> Request removal
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input name="full_name" type="text" placeholder="Full name" defaultValue={contact.full_name} className={inputClass} />
                    <input name="relationship" type="text" placeholder="Relationship" defaultValue={contact.relationship ?? ""} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input name="phone" type="text" placeholder="Phone" defaultValue={contact.phone ?? ""} className={inputClass} />
                    <input name="email" type="email" placeholder="Email" defaultValue={contact.email ?? ""} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-ink/70">
                    {Object.entries(AUTHORISATION_LABELS).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-1">
                        <input type="checkbox" name={key} defaultChecked={Boolean(contact[key as keyof typeof contact])} className="h-3.5 w-3.5 rounded border-coral-light" />
                        {label}
                      </label>
                    ))}
                  </div>
                  <button type="submit" className="rounded-full border border-coral-light px-3 py-1 text-xs font-semibold text-coral-dark hover:bg-coral-light">
                    Submit for review
                  </button>
                </form>
              </details>
            </li>
          ))}
        </ul>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-coral-dark">Propose a new contact</summary>
          <form action={submitChildContactChange} className="mt-3 space-y-3">
            <input type="hidden" name="child_id" value={child.id} />
            <input type="hidden" name="action" value="add" />
            <div className="grid grid-cols-2 gap-3">
              <input name="full_name" type="text" placeholder="Full name" required className={inputClass} />
              <input name="relationship" type="text" placeholder="Relationship, e.g. Grandmother" className={inputClass} />
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
            <button type="submit" className={secondaryButtonClass}>Submit for review</button>
          </form>
        </details>
      </div>

      {contactSubmissions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink/50">Your submitted contact changes</h3>
          {contactSubmissions.map((cs) => (
            <div key={cs.id} className={`p-4 ${cardClass}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-ink/80">
                  {cs.action === "add" ? "Add" : cs.action === "update" ? "Edit" : "Remove"}
                  {cs.full_name ? `: ${cs.full_name}` : ""}
                </p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[cs.status]}`}>
                  {STATUS_TEXT[cs.status]}
                </span>
              </div>
              {cs.rejection_reason && <p className="mt-2 text-xs text-ink/60">Reason: {cs.rejection_reason}</p>}
              {cs.status === "pending" && (
                <form action={deleteOwnPendingContactSubmission} className="mt-2">
                  <input type="hidden" name="submission_id" value={cs.id} />
                  <button type="submit" className="text-xs text-ink/30 hover:text-coral-dark">Cancel</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
