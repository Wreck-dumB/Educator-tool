import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { acceptStaffInvite } from "../../actions";
import { primaryButtonClass, errorBannerClass } from "@/lib/ui";

const ROLE_LABELS: Record<string, string> = {
  "2ic": "2IC (Assistant Director)",
  staff: "Staff",
};

export default async function AcceptStaffInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: previewRows } = await supabase.rpc("get_staff_invite_preview", { _token: token });
  const preview = previewRows?.[0];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!preview) {
    return (
      <InviteShell>
        <p className="text-ink/70">
          This invite link doesn&apos;t exist. Double-check the link, or ask whoever invited you to
          send a new one.
        </p>
      </InviteShell>
    );
  }

  if (preview.status !== "pending") {
    const statusText =
      preview.status === "accepted" ? "already been used" : preview.status === "revoked" ? "been revoked" : "expired";
    return (
      <InviteShell>
        <p className="text-ink/70">This invite has {statusText}. Ask for a new one if you still need to join.</p>
      </InviteShell>
    );
  }

  if (new Date(preview.expires_at) <= new Date()) {
    return (
      <InviteShell>
        <p className="text-ink/70">This invite has expired. Ask for a new one.</p>
      </InviteShell>
    );
  }

  const nextPath = `/onboarding/accept-invite/${token}`;

  if (!user) {
    return (
      <InviteShell>
        <p className="text-ink/70">
          You&apos;ve been invited to join <strong>{preview.service_name}</strong> as{" "}
          {ROLE_LABELS[preview.invited_role] ?? preview.invited_role}.
        </p>
        <p className="mt-4 text-sm text-ink/50">Log in or sign up to accept this invite.</p>
        <div className="mt-4 flex gap-3">
          <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className={primaryButtonClass}>
            Log in
          </Link>
          <Link
            href={`/signup?next=${encodeURIComponent(nextPath)}`}
            className="rounded-full border-2 border-sage px-4 py-2 text-sm font-semibold text-sage-dark hover:bg-sage-light"
          >
            Sign up
          </Link>
        </div>
      </InviteShell>
    );
  }

  return (
    <InviteShell>
      <p className="text-ink/70">
        You&apos;ve been invited to join <strong>{preview.service_name}</strong> as{" "}
        {ROLE_LABELS[preview.invited_role] ?? preview.invited_role}.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      <form action={acceptStaffInvite} className="mt-4">
        <input type="hidden" name="token" value={token} />
        <button type="submit" className={`w-full ${primaryButtonClass}`}>
          Join {preview.service_name}
        </button>
      </form>
    </InviteShell>
  );
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-coral-light bg-white p-8 shadow-sm">
        <h1 className="font-display text-center text-2xl font-semibold text-coral-dark">DR. SparkPlay</h1>
        {children}
      </div>
    </div>
  );
}
