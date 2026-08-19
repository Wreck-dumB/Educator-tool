import { notFound } from "next/navigation";
import Link from "next/link";
import { getChild } from "@/lib/supabase/children";
import {
  getEnrolmentSubmissions,
  getEnrolmentDocuments,
  getContactSubmissions,
  getSignedEnrolmentDocumentUrl,
} from "@/lib/supabase/enrolmentSubmissions";
import { AUTHORISATION_LABELS } from "@/lib/childContactLabels";
import { cardClass, inputClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import {
  approveEnrolmentSubmission,
  rejectEnrolmentSubmission,
  approveEnrolmentDocument,
  rejectEnrolmentDocument,
  approveContactSubmission,
  rejectContactSubmission,
} from "./actions";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  immunisation_statement: "Immunisation history statement",
  medical_management_plan: "Medical management / action plan",
  court_order: "Court order / parenting order",
  enrolment_form: "Enrolment form",
  other: "Other",
};

const STATUS_LABELS: Record<string, { text: string; cls: string }> = {
  pending: { text: "Pending review", cls: "text-amber-dark bg-amber-light" },
  approved: { text: "Approved", cls: "text-sage-dark bg-sage-light" },
  rejected: { text: "Rejected", cls: "text-coral-dark bg-coral-light" },
};

export default async function EnrolmentReviewPage({
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

  const [submissions, documents, contactSubmissions] = await Promise.all([
    getEnrolmentSubmissions(id),
    getEnrolmentDocuments(id),
    getContactSubmissions(id),
  ]);

  const documentsWithUrls = await Promise.all(
    documents.map(async (d) => ({ ...d, signedUrl: await getSignedEnrolmentDocumentUrl(d.storage_path) })),
  );

  const pendingSubmissions = submissions.filter((s) => s.status === "pending");
  const historySubmissions = submissions.filter((s) => s.status !== "pending");
  const pendingDocuments = documentsWithUrls.filter((d) => d.status === "pending");
  const historyDocuments = documentsWithUrls.filter((d) => d.status !== "pending");
  const pendingContacts = contactSubmissions.filter((c) => c.status === "pending");
  const historyContacts = contactSubmissions.filter((c) => c.status !== "pending");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">Enrolment updates</h1>
          <p className="mt-1 text-sm text-ink/60">
            Submissions from {child.first_name}&apos;s family — review and apply, or reject with a reason.
          </p>
        </div>
        <Link href={`/children/${child.id}`} className="text-sm font-medium text-ink/60 hover:text-coral-dark">
          ← Back to {child.first_name}
        </Link>
      </div>

      {error && <p className={errorBannerClass}>{error}</p>}

      {/* Profile / health submissions */}
      <div className="mt-8">
        <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-widest text-amber-dark">
          Pending profile/health updates ({pendingSubmissions.length})
        </h2>
        {pendingSubmissions.length === 0 ? (
          <p className="text-sm text-ink/50">Nothing awaiting review.</p>
        ) : (
          <div className="space-y-4">
            {pendingSubmissions.map((s) => (
              <div key={s.id} className={`p-5 border-l-4 border-amber-dark ${cardClass}`}>
                <p className="text-xs text-ink/40">Submitted {new Date(s.created_at).toLocaleDateString("en-AU")}</p>
                <form action={approveEnrolmentSubmission} className="mt-3 space-y-3">
                  <input type="hidden" name="child_id" value={child.id} />
                  <input type="hidden" name="submission_id" value={s.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-ink/70">First name</label>
                      <input name="first_name" type="text" required defaultValue={s.first_name ?? child.first_name} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink/70">Date of birth</label>
                      <input name="date_of_birth" type="date" defaultValue={s.date_of_birth ?? child.date_of_birth ?? ""} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/70">Current interests</label>
                    <input name="current_interests" type="text" defaultValue={s.current_interests ?? child.current_interests ?? ""} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/70">Additional needs</label>
                    <textarea name="additional_needs" rows={2} defaultValue={s.additional_needs ?? child.additional_needs ?? ""} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/70">Address</label>
                    <input name="address" type="text" defaultValue={s.address ?? child.address ?? ""} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-ink/70">Doctor / medical practice</label>
                      <input name="medical_practice_name" type="text" defaultValue={s.medical_practice_name ?? child.medical_practice_name ?? ""} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink/70">Practice phone</label>
                      <input name="medical_practice_phone" type="text" defaultValue={s.medical_practice_phone ?? child.medical_practice_phone ?? ""} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/70">Medicare number</label>
                    <input name="medicare_number" type="text" defaultValue={s.medicare_number ?? child.medicare_number ?? ""} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/70">Medical conditions</label>
                    <textarea name="medical_conditions" rows={2} defaultValue={s.medical_conditions ?? child.medical_conditions ?? ""} className={inputClass} />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-ink/70">
                    <input type="checkbox" name="is_anaphylaxis_risk" defaultChecked={s.is_anaphylaxis_risk ?? child.is_anaphylaxis_risk} className="h-4 w-4 rounded border-coral-light" />
                    Diagnosed as at risk of anaphylaxis
                  </label>
                  <div>
                    <label className="block text-xs font-medium text-ink/70">Medical management plan</label>
                    <textarea name="medical_management_plan" rows={2} defaultValue={s.medical_management_plan ?? child.medical_management_plan ?? ""} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/70">Dietary restrictions</label>
                    <input name="dietary_restrictions" type="text" defaultValue={s.dietary_restrictions ?? child.dietary_restrictions ?? ""} className={inputClass} />
                  </div>
                  <p className="text-xs text-ink/40">
                    Fields shown as submitted by the family — edit anything before applying.
                  </p>
                  <button type="submit" className={`w-full ${primaryButtonClass}`}>Apply to child&apos;s file</button>
                </form>
                <form action={rejectEnrolmentSubmission} className="mt-2 flex items-center gap-2">
                  <input type="hidden" name="child_id" value={child.id} />
                  <input type="hidden" name="submission_id" value={s.id} />
                  <input name="reason" type="text" placeholder="Reason (optional)" className="flex-1 rounded-xl border border-coral-light px-2 py-1 text-xs focus:border-coral focus:outline-none" />
                  <button type="submit" className="rounded-full border border-coral-light px-4 py-1.5 text-xs font-semibold text-coral-dark hover:bg-coral-light transition-colors">
                    Reject
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        {historySubmissions.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-semibold text-ink/40">History ({historySubmissions.length})</summary>
            <div className="mt-2 space-y-2">
              {historySubmissions.map((s) => {
                const badge = STATUS_LABELS[s.status];
                return (
                  <div key={s.id} className={`p-3 ${cardClass}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>{badge.text}</span>
                      <span className="text-xs text-ink/40">{new Date(s.created_at).toLocaleDateString("en-AU")}</span>
                    </div>
                    {s.rejection_reason && <p className="mt-1 text-xs text-ink/50">Reason: {s.rejection_reason}</p>}
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>

      {/* Documents */}
      <div className="mt-8">
        <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-widest text-amber-dark">
          Pending documents ({pendingDocuments.length})
        </h2>
        {pendingDocuments.length === 0 ? (
          <p className="text-sm text-ink/50">Nothing awaiting review.</p>
        ) : (
          <div className="space-y-3">
            {pendingDocuments.map((d) => (
              <div key={d.id} className={`p-4 border-l-4 border-amber-dark ${cardClass}`}>
                <p className="text-sm font-medium text-ink">{DOCUMENT_TYPE_LABELS[d.document_type] ?? d.document_type}</p>
                {d.signedUrl && (
                  <a href={d.signedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-coral-dark hover:underline">
                    View {d.original_filename} →
                  </a>
                )}
                {d.notes && <p className="mt-1 text-xs text-ink/50">{d.notes}</p>}
                <div className="mt-3 flex gap-2">
                  <form action={approveEnrolmentDocument}>
                    <input type="hidden" name="child_id" value={child.id} />
                    <input type="hidden" name="document_id" value={d.id} />
                    <button type="submit" className="rounded-full bg-sage px-4 py-1.5 text-xs font-semibold text-white hover:bg-sage-dark transition-colors">
                      Approve
                    </button>
                  </form>
                  <form action={rejectEnrolmentDocument} className="flex items-center gap-2">
                    <input type="hidden" name="child_id" value={child.id} />
                    <input type="hidden" name="document_id" value={d.id} />
                    <input name="reason" type="text" placeholder="Reason (optional)" className="rounded-xl border border-coral-light px-2 py-1 text-xs focus:border-coral focus:outline-none" />
                    <button type="submit" className="rounded-full border border-coral-light px-4 py-1.5 text-xs font-semibold text-coral-dark hover:bg-coral-light transition-colors">
                      Reject
                    </button>
                  </form>
                </div>
                {d.document_type === "immunisation_statement" && (
                  <p className="mt-2 text-xs text-ink/40">
                    Approving this only marks the document on file — go to the immunisation status
                    section below to certify you&apos;ve sighted it.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {historyDocuments.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-semibold text-ink/40">History ({historyDocuments.length})</summary>
            <div className="mt-2 space-y-2">
              {historyDocuments.map((d) => {
                const badge = STATUS_LABELS[d.status];
                return (
                  <div key={d.id} className={`p-3 ${cardClass}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm text-ink/80">{DOCUMENT_TYPE_LABELS[d.document_type] ?? d.document_type}</p>
                        {d.signedUrl && (
                          <a href={d.signedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-coral-dark hover:underline">
                            {d.original_filename} →
                          </a>
                        )}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>{badge.text}</span>
                    </div>
                    {d.rejection_reason && <p className="mt-1 text-xs text-ink/50">Reason: {d.rejection_reason}</p>}
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>

      {/* Contact submissions */}
      <div className="mt-8">
        <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-widest text-amber-dark">
          Pending contact changes ({pendingContacts.length})
        </h2>
        {pendingContacts.length === 0 ? (
          <p className="text-sm text-ink/50">Nothing awaiting review.</p>
        ) : (
          <div className="space-y-3">
            {pendingContacts.map((c) => (
              <div key={c.id} className={`p-4 border-l-4 border-amber-dark ${cardClass}`}>
                <p className="text-sm font-medium text-ink">
                  {c.action === "add" ? "Add new contact" : c.action === "update" ? "Edit contact" : "Remove contact"}
                  {c.full_name ? `: ${c.full_name}` : ""}
                </p>
                {c.action !== "remove" && (
                  <div className="mt-1 text-xs text-ink/60">
                    <p>{c.relationship}</p>
                    <p>{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(AUTHORISATION_LABELS)
                        .filter(([key]) => c[key as keyof typeof c])
                        .map(([key, label]) => (
                          <span key={key} className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark">
                            {label}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
                {c.notes && <p className="mt-1 text-xs text-ink/50">{c.notes}</p>}
                <div className="mt-3 flex gap-2">
                  <form action={approveContactSubmission}>
                    <input type="hidden" name="child_id" value={child.id} />
                    <input type="hidden" name="submission_id" value={c.id} />
                    <button type="submit" className="rounded-full bg-sage px-4 py-1.5 text-xs font-semibold text-white hover:bg-sage-dark transition-colors">
                      Approve
                    </button>
                  </form>
                  <form action={rejectContactSubmission} className="flex items-center gap-2">
                    <input type="hidden" name="child_id" value={child.id} />
                    <input type="hidden" name="submission_id" value={c.id} />
                    <input name="reason" type="text" placeholder="Reason (optional)" className="rounded-xl border border-coral-light px-2 py-1 text-xs focus:border-coral focus:outline-none" />
                    <button type="submit" className="rounded-full border border-coral-light px-4 py-1.5 text-xs font-semibold text-coral-dark hover:bg-coral-light transition-colors">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        {historyContacts.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-semibold text-ink/40">History ({historyContacts.length})</summary>
            <div className="mt-2 space-y-2">
              {historyContacts.map((c) => {
                const badge = STATUS_LABELS[c.status];
                return (
                  <div key={c.id} className={`p-3 ${cardClass}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-ink/80">
                        {c.action === "add" ? "Add" : c.action === "update" ? "Edit" : "Remove"}
                        {c.full_name ? `: ${c.full_name}` : ""}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>{badge.text}</span>
                    </div>
                    {c.rejection_reason && <p className="mt-1 text-xs text-ink/50">Reason: {c.rejection_reason}</p>}
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
