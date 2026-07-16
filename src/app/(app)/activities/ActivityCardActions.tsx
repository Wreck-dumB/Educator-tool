"use client";

import { useTransition } from "react";
import { archiveActivity, unarchiveActivity, deleteActivity } from "./actions";

export default function ActivityCardActions({
  id,
  isArchived,
}: {
  id: string;
  isArchived: boolean;
}) {
  const [archivePending, startArchive] = useTransition();
  const [deletePending, startDelete] = useTransition();

  function handleArchive() {
    const fd = new FormData();
    fd.set("id", id);
    startArchive(() => (isArchived ? unarchiveActivity(fd) : archiveActivity(fd)));
  }

  function handleDelete() {
    if (!confirm("Permanently delete this activity? This cannot be undone.")) return;
    const fd = new FormData();
    fd.set("id", id);
    startDelete(() => deleteActivity(fd));
  }

  return (
    <div className="flex flex-col justify-center gap-1.5">
      <button
        type="button"
        onClick={handleArchive}
        disabled={archivePending || deletePending}
        title={isArchived ? "Unarchive" : "Archive (hide from list)"}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink/15 text-sm text-ink/40 hover:border-ink/30 hover:text-ink/60 disabled:opacity-40"
      >
        {archivePending ? "…" : isArchived ? "↩" : "📦"}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={archivePending || deletePending}
        title="Delete permanently"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink/15 text-sm text-ink/40 hover:border-coral/40 hover:text-coral-dark disabled:opacity-40"
      >
        {deletePending ? "…" : "✕"}
      </button>
    </div>
  );
}
