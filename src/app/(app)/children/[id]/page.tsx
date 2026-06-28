import { notFound } from "next/navigation";
import { getChild, getChildInvites } from "@/lib/supabase/children";
import { updateChild, deleteChild, createChildInvite, revokeChildInvite } from "@/app/(app)/children/actions";
import { getObservations } from "@/lib/supabase/observations";
import { inputClass, cardClass, primaryButtonClass, secondaryButtonClass, errorBannerClass } from "@/lib/ui";

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

  const observations = await getObservations(id);
  const invites = await getChildInvites(id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">🧒 {child.first_name}</h1>

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
      </div>

      <div className={`mt-6 ${cardClass}`}>
        <div className="border-b border-coral-light px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">Family access</h2>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-ink/60">
            Invite {child.first_name}&apos;s family to a linked view where they can see what you
            explicitly choose to share, message you, and upload documents.
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={`mt-6 ${cardClass}`}>
        <div className="border-b border-coral-light px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">Observations</h2>
        </div>
        {observations.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink/50">
            Logged observations for {child.first_name} will appear here once you start saving
            them from generated activities.
          </p>
        ) : (
          <ul className="divide-y divide-coral-light">
            {observations.map((o) => (
              <li key={o.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink/80">{o.note_text}</p>
                  <p className="ml-3 shrink-0 text-xs text-ink/40">
                    {new Date(o.observed_at).toLocaleDateString()}
                  </p>
                </div>
                {o.eylf_codes.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {o.eylf_codes.map((code) => (
                      <span
                        key={code}
                        className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={deleteChild} className="mt-6">
        <input type="hidden" name="id" value={child.id} />
        <button type="submit" className="text-sm font-medium text-coral-dark hover:underline">
          Delete this child profile
        </button>
      </form>
    </div>
  );
}
