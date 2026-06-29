"use client";

import { updateQipItemStatus } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  achieved: "Achieved",
};

export default function StatusSelect({ itemId, status }: { itemId: string; status: string }) {
  return (
    <form action={updateQipItemStatus}>
      <input type="hidden" name="item_id" value={itemId} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.target.form?.requestSubmit()}
        className="rounded-full border border-coral-light px-2 py-0.5 text-xs text-ink/70"
      >
        <option value="not_started">{STATUS_LABELS.not_started}</option>
        <option value="in_progress">{STATUS_LABELS.in_progress}</option>
        <option value="achieved">{STATUS_LABELS.achieved}</option>
      </select>
    </form>
  );
}
