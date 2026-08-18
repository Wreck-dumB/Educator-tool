"use client";

import { useState, useTransition } from "react";
import { withdrawMediaConsent } from "@/app/accept-media-consent/actions";
import { errorBannerClass } from "@/lib/ui";

export default function WithdrawConsentButton() {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <p className="text-sm text-sage-dark">
        Recorded. Your service has been notified and will follow up with you directly.
      </p>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-ink/50 underline hover:text-coral-dark"
      >
        Withdraw my photo/media consent
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-coral-light bg-coral-light/20 p-3">
      <p className="text-sm text-ink/80">
        This records a request for your service to stop using your (or your child&apos;s) photos/videos
        going forward, and notifies them directly — it doesn&apos;t delete anything already shared or
        change your account access. They&apos;ll follow up with you about next steps.
      </p>
      {error && <p className={`mt-2 ${errorBannerClass}`}>{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await withdrawMediaConsent();
              if (result.error) setError(result.error);
              else setDone(true);
            })
          }
          className="rounded-full bg-coral px-4 py-1.5 text-xs font-semibold text-white hover:bg-coral-dark disabled:opacity-50"
        >
          {pending ? "Recording…" : "Yes, withdraw consent"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-full border border-ink/20 px-4 py-1.5 text-xs font-medium text-ink/60 hover:bg-ink/5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
