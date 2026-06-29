import Link from "next/link";
import { getPermissionSlips } from "@/lib/supabase/permissionSlips";
import { getChildren } from "@/lib/supabase/children";
import { inputClass, cardClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import { createPermissionSlip } from "./actions";

const SLIP_TYPE_LABELS: Record<string, string> = {
  excursion_consent: "Excursion consent",
  photo_media_consent: "Photo/media consent",
  medication_authorisation: "Medication authorisation",
  other: "Other",
};

export default async function PermissionSlipsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [slips, children] = await Promise.all([getPermissionSlips(), getChildren()]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Permission slips</h1>
      <p className="mt-1 text-sm text-ink/60">
        Send a permission slip to one or more families for digital sign-off — no more lost, damaged,
        or forgotten paper slips. Parents sign by typing their name and explicitly confirming, from
        their own linked account.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      <div className={`mt-6 p-5 ${cardClass}`}>
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
            <input name="title" type="text" required placeholder="e.g. Botanic Gardens excursion — 14 July" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/70">What families are consenting to</label>
            <textarea
              name="body_text"
              rows={4}
              required
              placeholder="e.g. I give permission for my child to attend the excursion to the Botanic Gardens on 14 July, travelling by foot, supervised by educators..."
              className={inputClass}
            />
            <p className="mt-1 text-xs text-ink/50">
              Tip: draft this wording in{" "}
              <Link href="/forms" className="underline">
                Forms
              </Link>{" "}
              first if you&apos;d like AI help, then paste the final text here.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-ink/70">Send to</p>
            <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-coral-light p-2">
              {children.length === 0 && <p className="p-2 text-sm text-ink/50">Add a child profile first.</p>}
              {children.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-ink/80">
                  <input type="checkbox" name="child_ids" value={c.id} className="h-4 w-4 rounded border-coral-light" />
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

      <div className="mt-6 space-y-4">
        {slips.length === 0 && <p className="text-sm text-ink/50">No permission slips sent yet.</p>}
        {slips.map((slip) => (
          <div key={slip.id} className={`p-4 ${cardClass}`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-semibold text-ink">{slip.title}</h3>
              <span className="shrink-0 rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark">
                {SLIP_TYPE_LABELS[slip.slip_type]}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-line text-sm text-ink/70">{slip.currentVersionText}</p>
            <ul className="mt-3 divide-y divide-coral-light">
              {slip.targets.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-ink/80">{t.childFirstName}</span>
                  {t.signature ? (
                    <span className="text-xs text-sage-dark">
                      ✓ Signed by {t.signature.signer_typed_name} · {new Date(t.signature.signed_at).toLocaleDateString()}
                      {t.sent_version_number !== slip.current_version && " (outdated version — re-send needed)"}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-dark">Awaiting signature</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
