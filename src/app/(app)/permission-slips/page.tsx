import type { Metadata } from "next";
import Link from "next/link";
import { getPermissionSlips } from "@/lib/supabase/permissionSlips";
import { getChildren } from "@/lib/supabase/children";
import { inputClass, cardClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import {
  createPermissionSlip,
  reviseAndResendSlip,
  closePermissionSlip,
  reopenPermissionSlip,
} from "./actions";

export const metadata: Metadata = { title: "Permission Slips · DR. SparkPlay" };

const SLIP_TYPE_LABELS: Record<string, string> = {
  excursion_consent: "Excursion consent",
  photo_media_consent: "Photo/media consent",
  medication_authorisation: "Medication authorisation",
  other: "Other",
};

const STATUS_COLOURS: Record<string, string> = {
  draft: "bg-ink/5 text-ink/50",
  sent: "bg-coral-light text-coral-dark",
  closed: "bg-sage-light text-sage-dark",
};

export default async function PermissionSlipsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { error, status: statusFilter = "open" } = await searchParams;
  const [allSlips, children] = await Promise.all([getPermissionSlips(), getChildren()]);

  const slips = allSlips.filter((s) => {
    if (statusFilter === "closed") return s.status === "closed";
    return s.status !== "closed";
  });

  const openCount = allSlips.filter((s) => s.status !== "closed").length;
  const closedCount = allSlips.filter((s) => s.status === "closed").length;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Permission slips</h1>
      <p className="mt-1 text-sm text-ink/60">
        Digital sign-off for families — no more lost paper slips. Parents sign by typing their name
        and confirming from their linked account.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      {/* Status filter tabs */}
      <div className="mt-5 flex gap-1 rounded-xl border border-coral-light bg-white p-1">
        <Link
          href="/permission-slips?status=open"
          className={`flex-1 rounded-lg py-1.5 text-center text-sm font-semibold transition-colors ${
            statusFilter !== "closed"
              ? "bg-coral text-white"
              : "text-ink/50 hover:text-ink/70"
          }`}
        >
          Open ({openCount})
        </Link>
        <Link
          href="/permission-slips?status=closed"
          className={`flex-1 rounded-lg py-1.5 text-center text-sm font-semibold transition-colors ${
            statusFilter === "closed"
              ? "bg-coral text-white"
              : "text-ink/50 hover:text-ink/70"
          }`}
        >
          Closed ({closedCount})
        </Link>
      </div>

      {/* Slip list */}
      <div className="mt-4 space-y-4">
        {slips.length === 0 && (
          <p className="py-6 text-center text-sm text-ink/50">
            {statusFilter === "closed" ? "No closed slips." : "No open slips."}
          </p>
        )}
        {slips.map((slip) => {
          const total = slip.targets.length;
          const signed = slip.targets.filter((t) => t.signature !== null).length;
          const pct = total === 0 ? 0 : Math.round((signed / total) * 100);
          const allSigned = signed === total && total > 0;

          return (
            <div key={slip.id} className={cardClass}>
              {/* Slip header */}
              <div className="flex items-start justify-between gap-3 border-b border-coral-light px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-semibold text-ink">{slip.title}</h3>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOURS[slip.status] ?? "bg-ink/5 text-ink/50"}`}
                    >
                      {slip.status.charAt(0).toUpperCase() + slip.status.slice(1)}
                    </span>
                    <span className="shrink-0 rounded-full bg-ink/5 px-2.5 py-0.5 text-xs text-ink/50">
                      {SLIP_TYPE_LABELS[slip.slip_type] ?? slip.slip_type}
                    </span>
                  </div>
                </div>
                {/* Progress chip */}
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-semibold ${allSigned ? "text-sage-dark" : "text-coral-dark"}`}
                  >
                    {signed}/{total} signed
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              {total > 0 && (
                <div className="px-4 pt-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-coral-light">
                    <div
                      className={`h-full rounded-full transition-all ${allSigned ? "bg-sage" : "bg-coral"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Body text preview */}
              <div className="px-4 py-3">
                <p className="text-sm text-ink/60 line-clamp-2">{slip.currentVersionText}</p>
                {slip.current_version > 1 && (
                  <p className="mt-1 text-xs text-ink/40">Version {slip.current_version}</p>
                )}
              </div>

              {/* Per-child sign-off list */}
              <ul className="divide-y divide-coral-light border-t border-coral-light">
                {slip.targets.map((t) => {
                  const outdated =
                    t.signature !== null && t.sent_version_number !== slip.current_version;
                  return (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-2 px-4 py-2 text-sm"
                    >
                      <span className="text-ink/80">{t.childFirstName}</span>
                      {t.signature ? (
                        <div className="text-right">
                          <span className="text-xs font-medium text-sage-dark">
                            ✓ {t.signature.signer_typed_name}
                          </span>
                          <p className="text-xs text-ink/40">
                            {new Date(t.signature.signed_at).toLocaleDateString("en-AU")}
                            {outdated && " · ⚠ outdated version — re-send needed"}
                          </p>
                        </div>
                      ) : (
                        <span className="rounded-full bg-amber-light px-2.5 py-0.5 text-xs font-semibold text-amber-dark">
                          Awaiting
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 border-t border-coral-light px-4 py-3">
                {slip.status !== "closed" ? (
                  <>
                    {/* Close */}
                    <form action={closePermissionSlip}>
                      <input type="hidden" name="slip_id" value={slip.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-sage-light px-3 py-1.5 text-xs font-semibold text-sage-dark hover:bg-sage-light transition-colors"
                      >
                        Close slip
                      </button>
                    </form>

                    {/* Revise & resend */}
                    <details className="w-full">
                      <summary className="cursor-pointer text-xs font-semibold text-coral-dark hover:underline list-none">
                        Revise &amp; resend ↓
                      </summary>
                      <form action={reviseAndResendSlip} className="mt-3 space-y-3">
                        <input type="hidden" name="slip_id" value={slip.id} />
                        <div>
                          <label className="block text-xs font-medium text-ink/70">Updated text</label>
                          <textarea
                            name="body_text"
                            rows={4}
                            required
                            defaultValue={slip.currentVersionText}
                            className={`${inputClass} text-sm`}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-ink/70">Re-send to</p>
                          <div className="mt-1 max-h-32 space-y-1 overflow-y-auto rounded-xl border border-coral-light p-2">
                            {children.map((c) => (
                              <label
                                key={c.id}
                                className="flex items-center gap-2 text-sm text-ink/80"
                              >
                                <input
                                  type="checkbox"
                                  name="child_ids"
                                  value={c.id}
                                  defaultChecked={slip.targets.some((t) => t.child_id === c.id)}
                                  className="h-4 w-4 rounded border-coral-light"
                                />
                                {c.first_name}
                              </label>
                            ))}
                          </div>
                        </div>
                        <button type="submit" className="rounded-full bg-coral px-4 py-1.5 text-xs font-semibold text-white hover:bg-coral-dark transition-colors">
                          Send updated version
                        </button>
                      </form>
                    </details>
                  </>
                ) : (
                  <form action={reopenPermissionSlip}>
                    <input type="hidden" name="slip_id" value={slip.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-coral-light px-3 py-1.5 text-xs font-semibold text-coral-dark hover:bg-coral-light transition-colors"
                    >
                      Reopen
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* E-signature legal notice */}
      <div className="mt-6 rounded-2xl border border-ink/10 bg-white/60 px-4 py-3 text-xs text-ink/50">
        <p>
          <strong className="text-ink/70">About these e-signatures:</strong>{" "}
          Parent signatures (typed name + confirmation) satisfy the{" "}
          <em>Electronic Transactions Act 1999</em> (Cth) for routine consent such as photo/media
          and general excursions. For{" "}
          <strong className="text-ink/70">medication authorisation</strong>, confirm with your
          insurer and regulatory authority whether an electronic signature is sufficient for your
          service&apos;s specific requirements before relying on it.
        </p>
        <p className="mt-1.5">
          Signatures are permanently bound to the exact version of text the parent was shown.
          If you revise and resend a slip, existing signatures remain valid for the version they
          signed — the &ldquo;outdated version&rdquo; indicator flags where re-consent is needed.
        </p>
      </div>

      {/* New slip form */}
      <div className={`mt-4 p-5 ${cardClass}`}>
        <h2 className="font-display text-sm font-semibold text-ink">New permission slip</h2>
        <form action={createPermissionSlip} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink/70">Type</label>
            <select name="slip_type" required defaultValue="excursion_consent" className={inputClass}>
              {Object.entries(SLIP_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/70">Title</label>
            <input
              name="title"
              type="text"
              required
              placeholder="e.g. Botanic Gardens excursion — 14 July"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/70">
              What families are consenting to
            </label>
            <textarea name="body_text" rows={4} required className={inputClass} />
            <p className="mt-1 text-xs text-ink/50">
              Tip: draft this wording in{" "}
              <Link href="/forms" className="underline">
                Forms
              </Link>{" "}
              first for AI-assisted wording.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-ink/70">Send to</p>
            <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-coral-light p-2">
              {children.length === 0 && (
                <p className="p-2 text-sm text-ink/50">Add a child profile first.</p>
              )}
              {children.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-ink/80">
                  <input
                    type="checkbox"
                    name="child_ids"
                    value={c.id}
                    className="h-4 w-4 rounded border-coral-light"
                  />
                  {c.first_name}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className={`w-full ${primaryButtonClass}`}>
            Send for signature
          </button>
        </form>
      </div>
    </div>
  );
}
