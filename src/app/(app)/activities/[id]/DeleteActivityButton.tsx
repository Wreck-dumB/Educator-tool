"use client";

import { useTransition } from "react";
import { deleteActivity } from "../actions";

export default function DeleteActivityButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Permanently delete this activity? This cannot be undone.")) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(() => deleteActivity(fd));
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="rounded-full border border-coral/40 px-3 py-1.5 text-sm text-coral-dark hover:bg-coral-light disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
