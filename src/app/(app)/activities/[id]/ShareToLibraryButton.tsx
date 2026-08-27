"use client";

import { useState, useTransition } from "react";
import { shareActivityToLibrary } from "./shareActions";
import type { Database } from "@/lib/types/database.types";

type Submission = Database["public"]["Tables"]["shared_library_activities"]["Row"] | null;

export default function ShareToLibraryButton({ activityId, initialSubmission }: { activityId: string; initialSubmission: Submission }) {
  const [pending, startTransition] = useTransition();
  const [submission, setSubmission] = useState(initialSubmission);
  const [error, setError] = useState<string | null>(null);

  function handleShare() {
    if (
      !confirm(
        "Share this activity to the DR. SparkPlay community library?\n\n" +
          "It'll be automatically checked for copyright issues and personal information, then reviewed by an admin before going live. Double-check it doesn't mention any child by name.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await shareActivityToLibrary(activityId);
      if ("error" in result) {
        setError(result.error);
        // A flagged/failed submission still creates a row — refetch isn't
        // wired here to keep this simple; the error message is enough
        // context, and the page-level revalidation updates status on reload.
      } else {
        setError(null);
      }
      // Optimistic status stand-in until the next full page load/revalidation.
      setSubmission((prev) => prev ?? ({ status: "pending_ai_review" } as Submission));
    });
  }

  if (submission?.status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-light px-4 py-2 text-sm font-medium text-sage-dark">
        ✓ Shared to the community library
      </span>
    );
  }

  if (submission?.status === "pending_admin_review") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sage-light px-4 py-2 text-sm font-medium text-sage-dark">
        ⏳ Cleared by automated review — awaiting admin approval
      </span>
    );
  }

  if (submission?.status === "rejected") {
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-light px-4 py-2 text-sm font-medium text-coral-dark">
          Not approved for the community library
        </span>
        {submission.admin_rejection_reason && (
          <p className="text-xs text-ink/50">{submission.admin_rejection_reason}</p>
        )}
      </div>
    );
  }

  if (submission?.status === "ai_flagged") {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-coral-dark">
          {submission.ai_review_notes ?? "Automated review flagged this activity."}
        </p>
        <button
          type="button"
          onClick={handleShare}
          disabled={pending}
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-coral-light px-4 py-2 text-sm font-medium text-coral-dark transition-colors hover:bg-coral-light disabled:opacity-50"
        >
          {pending ? "Reviewing…" : "🔁 Try sharing again"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleShare}
        disabled={pending || submission?.status === "pending_ai_review"}
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-sage-light px-4 py-2 text-sm font-medium text-sage-dark transition-colors hover:bg-sage-light disabled:opacity-50"
      >
        {pending || submission?.status === "pending_ai_review" ? "Reviewing…" : "🌐 Share to DR. SparkPlay library"}
      </button>
      {error && <p className="text-xs text-coral-dark">{error}</p>}
    </div>
  );
}
