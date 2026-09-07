"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProgram } from "../actions";
import { errorBannerClass } from "@/lib/ui";

// Deleting a saved program can throw away weeks of planning, so a single
// confirm() dialog (the pattern used for a single activity elsewhere) isn't
// enough friction here — this requires typing the exact program title before
// the delete button will even enable.
export default function DeleteProgramButton({ programId, title }: { programId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (typed !== title) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProgram(programId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push("/programs");
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-ink/40 hover:text-coral-dark"
      >
        Delete this program…
      </button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-coral-light bg-coral-light/20 p-4">
      <p className="text-sm font-semibold text-coral-dark">Permanently delete &ldquo;{title}&rdquo;?</p>
      <p className="mt-1 text-sm text-ink/60">
        This removes the program and every activity in it for good — there&rsquo;s no undo. Type the program title
        below to confirm.
      </p>
      <input
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={title}
        autoFocus
        className="mt-3 w-full rounded-lg border border-coral-light bg-white px-3 py-1.5 text-sm focus:border-coral focus:outline-none"
      />
      {error && <p className={errorBannerClass}>{error}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={typed !== title || pending}
          className="rounded-full bg-coral px-4 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Deleting…" : "Permanently delete"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTyped("");
            setError(null);
          }}
          className="text-sm text-ink/50 hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
