"use client";

import { useState, useTransition } from "react";
import { setRoomCapacity } from "./actions";

interface Props {
  roomId: string;
  currentCapacity: number | null;
}

export default function SetCapacityForm({ roomId, currentCapacity }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(currentCapacity ?? ""));
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cap = parseInt(value, 10);
    if (isNaN(cap) || cap < 1) return;
    startTransition(async () => {
      await setRoomCapacity(roomId, cap);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={200}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-16 rounded-xl border border-coral-light px-2 py-1 text-sm text-ink focus:border-coral focus:outline-none"
          autoFocus
        />
        <button type="submit" disabled={pending} className="rounded-full bg-coral px-3 py-1 text-xs font-semibold text-white hover:bg-coral-dark disabled:opacity-50">
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-ink/40 hover:text-ink/60">
          Cancel
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-xs text-ink/40 hover:text-coral-dark"
    >
      {currentCapacity !== null ? `Capacity: ${currentCapacity}` : "Set capacity"}
    </button>
  );
}
