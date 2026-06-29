import { getChildren } from "@/lib/supabase/children";
import { getSlipsForParentChild } from "@/lib/supabase/permissionSlips";
import { cardClass, inputClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import { signPermissionSlip } from "./actions";

const SLIP_TYPE_LABELS: Record<string, string> = {
  excursion_consent: "Excursion consent",
  photo_media_consent: "Photo/media consent",
  medication_authorisation: "Medication authorisation",
  other: "Other",
};

export default async function ParentPermissionSlipsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const children = await getChildren();
  const entriesByChild = await Promise.all(
    children.map(async (child) => ({
      child,
      entries: await getSlipsForParentChild(child.id),
    })),
  );

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Permission slips</h1>
      <p className="mt-1 text-sm text-ink/60">
        Review and sign from here — no paper to lose, damage, or forget.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      <div className="mt-6 space-y-4">
        {entriesByChild.flatMap(({ entries }) => entries).length === 0 && (
          <p className="text-sm text-ink/50">No permission slips right now.</p>
        )}

        {entriesByChild.map(({ child, entries }) =>
          entries.map(({ target, slip, version, signature }) => {
            if (!slip || !version) return null;
            const isOutdated = target.sent_version_number !== slip.current_version;
            return (
              <div key={target.id} className={`p-4 ${cardClass}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-semibold text-ink">{slip.title}</h3>
                  <span className="shrink-0 rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark">
                    {SLIP_TYPE_LABELS[slip.slip_type]}
                  </span>
                </div>
                <p className="text-xs text-ink/50">For {child.first_name}</p>
                <p className="mt-2 whitespace-pre-line text-sm text-ink/80">{version.body_text}</p>

                {version.requires_high_stakes_ack && (
                  <p className="mt-2 rounded-xl bg-amber-light px-3 py-2 text-xs text-amber-dark">
                    This is a digital confirmation, not necessarily a substitute for any
                    additional process your service requires for medication/medical
                    authorisation — check with your educator if unsure.
                  </p>
                )}

                {signature && !isOutdated && (
                  <p className="mt-3 text-sm text-sage-dark">
                    ✓ Signed by {signature.signer_typed_name} on {new Date(signature.signed_at).toLocaleDateString()}
                  </p>
                )}

                {(!signature || isOutdated) && (
                  <form action={signPermissionSlip} className="mt-3 space-y-3">
                    <input type="hidden" name="slip_id" value={slip.id} />
                    <input type="hidden" name="child_id" value={child.id} />
                    <input type="hidden" name="version_id" value={version.id} />
                    {isOutdated && (
                      <p className="text-xs text-amber-dark">
                        This has been updated since you last signed — please review and re-sign.
                      </p>
                    )}
                    <input
                      name="signer_typed_name"
                      type="text"
                      required
                      placeholder="Type your full name to sign"
                      className={inputClass}
                    />
                    <label className="flex items-start gap-2 text-sm text-ink/80">
                      <input type="checkbox" name="affirmed" required className="mt-1 h-4 w-4 rounded border-coral-light" />
                      I have read and agree to the above.
                    </label>
                    <button type="submit" className={primaryButtonClass}>
                      Sign
                    </button>
                  </form>
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
