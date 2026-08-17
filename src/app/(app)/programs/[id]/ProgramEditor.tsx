"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { ProgramEntry, ProgramBlock, ProgramStatus } from "@/lib/types/domain";
import { DEFAULT_PROGRAM_BLOCKS } from "@/lib/programBlocks";
import { isWeekday, eachDateInRange } from "@/lib/programDates";
import { primaryButtonClass, secondaryButtonClass, errorBannerClass } from "@/lib/ui";
import {
  updateProgramEntry,
  deleteProgramEntry,
  swapProgramEntryOrder,
  updateProgramBlocks,
  setProgramStatus,
} from "../actions";

const UNSORTED_KEY = "__unsorted__";

function formatDay(dateStr: string): string {
  // Fixed locale, not the environment default: this renders inside a client
  // component that Next.js also renders on the server for the initial HTML,
  // and Node's default locale can differ from the browser's — leaving the
  // locale unpinned caused a real client/server text mismatch (e.g. "17 Aug"
  // vs "Aug 17") and a React hydration error.
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-AU", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

interface ActivityOption {
  id: string;
  title: string;
}

interface Props {
  programId: string;
  startDate: string;
  endDate: string;
  status: ProgramStatus;
  initialBlocks: ProgramBlock[];
  initialEntries: ProgramEntry[];
  activities: ActivityOption[];
}

export default function ProgramEditor({ programId, startDate, endDate, status, initialBlocks, initialEntries, activities }: Props) {
  const [blocks, setBlocks] = useState<ProgramBlock[]>(initialBlocks.length > 0 ? initialBlocks : DEFAULT_PROGRAM_BLOCKS);
  const [entries, setEntries] = useState<ProgramEntry[]>(initialEntries);
  const [programStatus, setProgramStatusLocal] = useState<ProgramStatus>(status);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [, startTransition] = useTransition();

  const weekdayDates = eachDateInRange(startDate, endDate).filter(isWeekday);
  const extraDates = [...new Set(entries.map((e) => e.day_date))]
    .filter((d) => !weekdayDates.includes(d))
    .sort();
  const columns = [...weekdayDates, ...extraDates];

  function entriesFor(dayDate: string, blockKey: string | null): ProgramEntry[] {
    return entries
      .filter((e) => e.day_date === dayDate && (e.block_key ?? UNSORTED_KEY) === (blockKey ?? UNSORTED_KEY))
      .sort((a, b) => a.order_index - b.order_index);
  }

  function patchEntry(id: string, patch: Partial<ProgramEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function handleTextCommit(entry: ProgramEntry, field: "title" | "notes", value: string) {
    const nextValue = field === "notes" ? value.trim() || null : value.trim();
    if (field === "title" && !nextValue) return; // titles can't be blanked out
    if (entry[field] === nextValue) return;
    patchEntry(entry.id, { [field]: nextValue } as Partial<ProgramEntry>);
    startTransition(async () => {
      const result = await updateProgramEntry(entry.id, programId, { [field]: nextValue });
      if ("error" in result) setError(result.error);
    });
  }

  function handleBlockChange(entry: ProgramEntry, newBlockKey: string) {
    const resolvedKey = newBlockKey === UNSORTED_KEY ? null : newBlockKey;
    const target = entriesFor(entry.day_date, resolvedKey);
    const nextOrder = target.length > 0 ? Math.max(...target.map((e) => e.order_index)) + 1 : 0;
    patchEntry(entry.id, { block_key: resolvedKey, order_index: nextOrder });
    startTransition(async () => {
      const result = await updateProgramEntry(entry.id, programId, { blockKey: resolvedKey, orderIndex: nextOrder });
      if ("error" in result) setError(result.error);
    });
  }

  function handleReorder(entry: ProgramEntry, direction: "up" | "down") {
    const siblings = entriesFor(entry.day_date, entry.block_key);
    const idx = siblings.findIndex((e) => e.id === entry.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];
    patchEntry(entry.id, { order_index: other.order_index });
    patchEntry(other.id, { order_index: entry.order_index });
    startTransition(async () => {
      const result = await swapProgramEntryOrder(
        programId,
        { id: entry.id, orderIndex: entry.order_index },
        { id: other.id, orderIndex: other.order_index },
      );
      if ("error" in result) setError(result.error);
    });
  }

  function handleActivityLink(entry: ProgramEntry, activityId: string) {
    const resolved = activityId || null;
    patchEntry(entry.id, { activity_id: resolved });
    startTransition(async () => {
      const result = await updateProgramEntry(entry.id, programId, { activityId: resolved });
      if ("error" in result) setError(result.error);
    });
  }

  function handleStepsCommit(entry: ProgramEntry, stepsText: string) {
    const steps = stepsText.split("\n").map((s) => s.trim()).filter(Boolean);
    patchEntry(entry.id, { steps });
    startTransition(async () => {
      const result = await updateProgramEntry(entry.id, programId, { steps });
      if ("error" in result) setError(result.error);
    });
  }

  function handleDelete(entry: ProgramEntry) {
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    startTransition(async () => {
      const result = await deleteProgramEntry(entry.id, programId);
      if ("error" in result) setError(result.error);
    });
  }

  function handleBlockRename(index: number, label: string) {
    const trimmed = label.trim();
    if (!trimmed || blocks[index].label === trimmed) return;
    const next = blocks.map((b, i) => (i === index ? { ...b, label: trimmed } : b));
    setBlocks(next);
    startTransition(async () => {
      const result = await updateProgramBlocks(programId, next);
      if ("error" in result) setError(result.error);
    });
  }

  function handleBlockReorder(index: number, direction: "up" | "down") {
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[swapIdx]] = [next[swapIdx], next[index]];
    setBlocks(next);
    startTransition(async () => {
      const result = await updateProgramBlocks(programId, next);
      if ("error" in result) setError(result.error);
    });
  }

  async function handlePublishToggle() {
    const next: ProgramStatus = programStatus === "published" ? "draft" : "published";
    setPublishing(true);
    const result = await setProgramStatus(programId, next);
    setPublishing(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    // Only flip the button — and therefore what a user relies on before
    // opening the printable calendar — once the write is actually confirmed,
    // so "View calendar" right after publishing never shows a stale draft.
    setProgramStatusLocal(next);
  }

  const unsortedCount = entries.filter((e) => !e.block_key).length;

  return (
    <div>
      {error && <p className={errorBannerClass}>{error}</p>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={handlePublishToggle}
            disabled={publishing}
            className={programStatus === "published" ? secondaryButtonClass : primaryButtonClass}
          >
            {publishing ? "Saving…" : programStatus === "published" ? "Published ✓ (unpublish)" : "Publish"}
          </button>
          {unsortedCount > 0 && (
            <span className="ml-3 text-xs font-medium text-amber-dark">
              {unsortedCount} activit{unsortedCount === 1 ? "y isn't" : "ies aren't"} sorted into a block yet
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href={`/programs/${programId}/today`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-coral-dark hover:underline"
          >
            Open today&rsquo;s room guide →
          </a>
          <a
            href={`/programs/${programId}/calendar`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-coral-dark hover:underline"
          >
            View printable weekly calendar →
          </a>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-coral-light">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-coral-light/40">
              <th className="w-40 px-3 py-2 text-left text-xs font-semibold uppercase tracking-widest text-ink/50">Block of the day</th>
              {columns.map((date) => (
                <th key={date} className="px-3 py-2 text-left text-xs font-semibold text-ink">
                  {formatDay(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-coral-light/50">
              <td className="px-3 py-2 align-top text-xs font-semibold text-ink/60">Unsorted</td>
              {columns.map((date) => (
                <td key={date} className="px-2 py-1.5 align-top">
                  <EntryCell
                    entries={entriesFor(date, null)}
                    blocks={blocks}
                    activities={activities}
                    onTextCommit={handleTextCommit}
                    onBlockChange={handleBlockChange}
                    onReorder={handleReorder}
                    onDelete={handleDelete}
                    onActivityLink={handleActivityLink}
                    onStepsCommit={handleStepsCommit}
                  />
                </td>
              ))}
            </tr>
            {blocks.map((block, index) => (
              <tr key={block.key} className="border-t border-coral-light/50 hover:bg-coral-light/10">
                <td className="px-3 py-2 align-top">
                  <input
                    defaultValue={block.label}
                    onBlur={(e) => handleBlockRename(index, e.target.value)}
                    className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-xs font-semibold text-ink/70 hover:border-coral-light focus:border-coral focus:bg-white focus:outline-none"
                  />
                  <div className="mt-1 flex gap-1">
                    <button type="button" onClick={() => handleBlockReorder(index, "up")} className="text-[10px] text-ink/30 hover:text-coral-dark" title="Move block up">▲</button>
                    <button type="button" onClick={() => handleBlockReorder(index, "down")} className="text-[10px] text-ink/30 hover:text-coral-dark" title="Move block down">▼</button>
                  </div>
                </td>
                {columns.map((date) => (
                  <td key={date} className="px-2 py-1.5 align-top">
                    <EntryCell
                      entries={entriesFor(date, block.key)}
                      blocks={blocks}
                      activities={activities}
                      onTextCommit={handleTextCommit}
                      onBlockChange={handleBlockChange}
                      onReorder={handleReorder}
                      onDelete={handleDelete}
                      onActivityLink={handleActivityLink}
                      onStepsCommit={handleStepsCommit}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink/40">
        Edit an activity&rsquo;s wording directly, use the block dropdown to move it into a different part of the day, and the arrows to reorder within a block.
      </p>
    </div>
  );
}

function EntryCell({
  entries,
  blocks,
  activities,
  onTextCommit,
  onBlockChange,
  onReorder,
  onDelete,
  onActivityLink,
  onStepsCommit,
}: {
  entries: ProgramEntry[];
  blocks: ProgramBlock[];
  activities: { id: string; title: string }[];
  onTextCommit: (entry: ProgramEntry, field: "title" | "notes", value: string) => void;
  onBlockChange: (entry: ProgramEntry, newBlockKey: string) => void;
  onReorder: (entry: ProgramEntry, direction: "up" | "down") => void;
  onDelete: (entry: ProgramEntry) => void;
  onActivityLink: (entry: ProgramEntry, activityId: string) => void;
  onStepsCommit: (entry: ProgramEntry, stepsText: string) => void;
}) {
  const activityTitleById = new Map(activities.map((a) => [a.id, a.title]));
  if (entries.length === 0) return <span className="text-xs text-ink/30">—</span>;
  return (
    <div className="space-y-2">
      {entries.map((entry, idx) => (
        <div key={entry.id} className="rounded-lg border border-coral-light/60 bg-white p-1.5">
          <textarea
            defaultValue={entry.title}
            rows={2}
            onBlur={(e) => onTextCommit(entry, "title", e.target.value)}
            className="w-full resize-none rounded-md border-none bg-transparent p-0.5 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-coral"
          />
          <textarea
            defaultValue={entry.notes ?? ""}
            rows={1}
            placeholder="Notes…"
            onBlur={(e) => onTextCommit(entry, "notes", e.target.value)}
            className="mt-0.5 w-full resize-none rounded-md border-none bg-transparent p-0.5 text-[11px] text-ink/60 placeholder:text-ink/30 focus:outline-none focus:ring-1 focus:ring-coral"
          />

          {entry.activity_id ? (
            <div className="mt-1 flex items-center justify-between gap-1">
              <Link
                href={`/activities/${entry.activity_id}`}
                target="_blank"
                className="truncate text-[10px] font-medium text-sage-dark hover:underline"
                title={activityTitleById.get(entry.activity_id) ?? "View linked activity"}
              >
                📌 {activityTitleById.get(entry.activity_id) ?? "Linked activity"}
              </Link>
              <button
                type="button"
                onClick={() => onActivityLink(entry, "")}
                className="shrink-0 text-[10px] text-ink/30 hover:text-coral-dark"
                title="Unlink from this activity"
              >
                unlink
              </button>
            </div>
          ) : (
            <div className="mt-1 space-y-1">
              {activities.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) onActivityLink(entry, e.target.value); }}
                  className="w-full rounded-md border border-coral-light/60 bg-white px-1 py-0.5 text-[10px] text-ink/60"
                >
                  <option value="" disabled>Link to a saved activity…</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              )}
              <textarea
                defaultValue={entry.steps.join("\n")}
                rows={2}
                placeholder="Quick directions (one step per line)…"
                onBlur={(e) => onStepsCommit(entry, e.target.value)}
                className="w-full resize-none rounded-md border border-coral-light/60 bg-white p-1 text-[10px] text-ink/60 placeholder:text-ink/30 focus:outline-none focus:ring-1 focus:ring-coral"
              />
            </div>
          )}

          <div className="mt-1 flex items-center gap-1">
            <select
              value={entry.block_key ?? UNSORTED_KEY}
              onChange={(e) => onBlockChange(entry, e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-coral-light/60 bg-white px-1 py-0.5 text-[10px] text-ink/60"
            >
              <option value={UNSORTED_KEY}>Unsorted</option>
              {blocks.map((b) => (
                <option key={b.key} value={b.key}>{b.label}</option>
              ))}
            </select>
            <button type="button" disabled={idx === 0} onClick={() => onReorder(entry, "up")} className="shrink-0 text-[10px] text-ink/30 hover:text-coral-dark disabled:opacity-20" title="Move up">▲</button>
            <button type="button" disabled={idx === entries.length - 1} onClick={() => onReorder(entry, "down")} className="shrink-0 text-[10px] text-ink/30 hover:text-coral-dark disabled:opacity-20" title="Move down">▼</button>
            <button type="button" onClick={() => onDelete(entry)} className="shrink-0 text-[10px] text-ink/30 hover:text-coral-dark" title="Remove">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}
