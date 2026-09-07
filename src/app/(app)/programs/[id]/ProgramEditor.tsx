"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ProgramEntry, ProgramBlock, ProgramStatus } from "@/lib/types/domain";
import { DEFAULT_PROGRAM_BLOCKS } from "@/lib/programBlocks";
import { isWeekday, eachDateInRange } from "@/lib/programDates";
import { primaryButtonClass, secondaryButtonClass, errorBannerClass } from "@/lib/ui";
import {
  addProgramEntry,
  updateProgramEntry,
  deleteProgramEntry,
  swapProgramEntryOrder,
  reorderProgramEntries,
  updateProgramBlocks,
  setProgramStatus,
} from "../actions";

const UNSORTED_KEY = "__unsorted__";

// Groups entries into droppable containers keyed by day + block, so an entry
// dragged between blocks on the same day resolves to a single container id.
function cellId(dayDate: string, blockKey: string | null): string {
  return `cell::${dayDate}::${blockKey ?? UNSORTED_KEY}`;
}

function parseCellId(id: string): { dayDate: string; blockKey: string | null } | null {
  if (!id.startsWith("cell::")) return null;
  const [, dayDate, blockPart] = id.split("::");
  if (!dayDate || blockPart === undefined) return null;
  return { dayDate, blockKey: blockPart === UNSORTED_KEY ? null : blockPart };
}

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
  const [draggingEntry, setDraggingEntry] = useState<ProgramEntry | null>(null);
  const [draggingBlock, setDraggingBlock] = useState<ProgramBlock | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  function handleEntryDragStart(event: DragStartEvent) {
    const entry = entries.find((e) => e.id === event.active.id);
    setDraggingEntry(entry ?? null);
  }

  function handleEntryDragEnd(event: DragEndEvent) {
    setDraggingEntry(null);
    const { active, over } = event;
    if (!over) return;

    const activeEntry = entries.find((e) => e.id === active.id);
    if (!activeEntry) return;

    const overId = String(over.id);
    const overEntry = entries.find((e) => e.id === overId);
    const target = overEntry
      ? { dayDate: overEntry.day_date, blockKey: overEntry.block_key }
      : parseCellId(overId);
    // Reordering only ever happens within the same day's blocks — dragging
    // an entry to another date would silently reschedule it, which isn't
    // what "reorder the layout" means here.
    if (!target || target.dayDate !== activeEntry.day_date) return;

    const sameContainer = target.blockKey === activeEntry.block_key;
    let reordered: ProgramEntry[];
    if (sameContainer) {
      // Reordering inside one block: move the dragged card to the position
      // it was dropped on — arrayMove, not "insert before the target", so
      // dropping onto the very next card actually swaps them instead of
      // silently landing back where it started.
      const group = entriesFor(target.dayDate, target.blockKey);
      const oldIndex = group.findIndex((e) => e.id === activeEntry.id);
      const newIndex = overEntry ? group.findIndex((e) => e.id === overEntry.id) : group.length - 1;
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      reordered = arrayMove(group, oldIndex, newIndex);
    } else {
      const destSiblings = entriesFor(target.dayDate, target.blockKey);
      const insertAt = overEntry ? destSiblings.findIndex((e) => e.id === overEntry.id) : destSiblings.length;
      reordered = [...destSiblings];
      reordered.splice(insertAt, 0, activeEntry);
    }

    const updates = reordered.map((e, i) => ({ id: e.id, orderIndex: i, blockKey: target.blockKey }));
    setEntries((prev) => {
      const byId = new Map(updates.map((u) => [u.id, u]));
      return prev.map((e) => {
        const u = byId.get(e.id);
        return u ? { ...e, order_index: u.orderIndex, block_key: u.blockKey } : e;
      });
    });
    startTransition(async () => {
      const result = await reorderProgramEntries(programId, updates);
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

  async function handleAddEntry(
    dayDate: string,
    blockKey: string | null,
    input: { activityId?: string | null; title: string; notes?: string | null },
  ) {
    const result = await addProgramEntry(programId, dayDate, blockKey, input);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setEntries((prev) => [...prev, result.entry]);
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

  function handleBlockDragStart(event: DragStartEvent) {
    const block = blocks.find((b) => b.key === event.active.id);
    setDraggingBlock(block ?? null);
  }

  function handleBlockDragEnd(event: DragEndEvent) {
    setDraggingBlock(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = blocks.findIndex((b) => b.key === active.id);
    const toIndex = blocks.findIndex((b) => b.key === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = arrayMove(blocks, fromIndex, toIndex);
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

  // Entry cards and block rows are both draggable inside one DndContext,
  // distinguished by the `type` tag each sets on its own sortable data —
  // that's what lets a single onDragStart/onDragEnd route to the right handler.
  function handleDragStart(event: DragStartEvent) {
    const type = event.active.data.current?.type;
    if (type === "block") handleBlockDragStart(event);
    else if (type === "entry") handleEntryDragStart(event);
  }

  function handleDragEnd(event: DragEndEvent) {
    const type = event.active.data.current?.type;
    if (type === "block") handleBlockDragEnd(event);
    else if (type === "entry") handleEntryDragEnd(event);
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

      <DndContext
        id={`program-editor-${programId}`}
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
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
                      dayDate={date}
                      blockKey={null}
                      onTextCommit={handleTextCommit}
                      onBlockChange={handleBlockChange}
                      onReorder={handleReorder}
                      onDelete={handleDelete}
                      onActivityLink={handleActivityLink}
                      onStepsCommit={handleStepsCommit}
                      onAdd={handleAddEntry}
                    />
                  </td>
                ))}
              </tr>
              <SortableContext items={blocks.map((b) => b.key)} strategy={verticalListSortingStrategy}>
                {blocks.map((block, index) => (
                  <SortableBlockRow key={block.key} block={block} index={index} onRename={handleBlockRename} onReorder={handleBlockReorder}>
                    {columns.map((date) => (
                      <td key={date} className="px-2 py-1.5 align-top">
                        <EntryCell
                          entries={entriesFor(date, block.key)}
                          blocks={blocks}
                          activities={activities}
                          dayDate={date}
                          blockKey={block.key}
                          onTextCommit={handleTextCommit}
                          onBlockChange={handleBlockChange}
                          onReorder={handleReorder}
                          onDelete={handleDelete}
                          onActivityLink={handleActivityLink}
                          onStepsCommit={handleStepsCommit}
                          onAdd={handleAddEntry}
                        />
                      </td>
                    ))}
                  </SortableBlockRow>
                ))}
              </SortableContext>
            </tbody>
          </table>
        </div>
        <DragOverlay>
          {draggingEntry ? <EntryCardPreview entry={draggingEntry} /> : null}
          {draggingBlock ? <BlockRowPreview label={draggingBlock.label} /> : null}
        </DragOverlay>
      </DndContext>
      <p className="mt-2 text-xs text-ink/40">
        Drag the ⠿ handle to reorder — activities within a block, or whole blocks up and down the day. The dropdown and arrows still work too.
      </p>
    </div>
  );
}

function SortableBlockRow({
  block,
  index,
  onRename,
  onReorder,
  children,
}: {
  block: ProgramBlock;
  index: number;
  onRename: (index: number, label: string) => void;
  onReorder: (index: number, direction: "up" | "down") => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.key,
    data: { type: "block" },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-t border-coral-light/50 hover:bg-coral-light/10">
      <td className="px-3 py-2 align-top">
        <div className="flex items-start gap-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab touch-none text-xs text-ink/30 hover:text-coral-dark active:cursor-grabbing"
            title="Drag to reorder this block"
          >
            ⠿
          </button>
          <div className="min-w-0 flex-1">
            <input
              defaultValue={block.label}
              onBlur={(e) => onRename(index, e.target.value)}
              className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-xs font-semibold text-ink/70 hover:border-coral-light focus:border-coral focus:bg-white focus:outline-none"
            />
            <div className="mt-1 flex gap-1">
              <button type="button" onClick={() => onReorder(index, "up")} className="text-[10px] text-ink/30 hover:text-coral-dark" title="Move block up">▲</button>
              <button type="button" onClick={() => onReorder(index, "down")} className="text-[10px] text-ink/30 hover:text-coral-dark" title="Move block down">▼</button>
            </div>
          </div>
        </div>
      </td>
      {children}
    </tr>
  );
}

function BlockRowPreview({ label }: { label: string }) {
  return (
    <div className="w-40 rounded-lg border border-coral bg-white px-3 py-2 text-xs font-semibold text-ink/70 shadow-lg">
      ⠿ {label}
    </div>
  );
}

function EntryCardPreview({ entry }: { entry: ProgramEntry }) {
  return (
    <div className="w-56 rounded-lg border border-coral bg-white p-1.5 text-xs font-medium text-ink shadow-lg">
      {entry.title}
    </div>
  );
}

function EntryCell({
  entries,
  blocks,
  activities,
  dayDate,
  blockKey,
  onTextCommit,
  onBlockChange,
  onReorder,
  onDelete,
  onActivityLink,
  onStepsCommit,
  onAdd,
}: {
  entries: ProgramEntry[];
  blocks: ProgramBlock[];
  activities: { id: string; title: string }[];
  dayDate: string;
  blockKey: string | null;
  onTextCommit: (entry: ProgramEntry, field: "title" | "notes", value: string) => void;
  onBlockChange: (entry: ProgramEntry, newBlockKey: string) => void;
  onReorder: (entry: ProgramEntry, direction: "up" | "down") => void;
  onDelete: (entry: ProgramEntry) => void;
  onActivityLink: (entry: ProgramEntry, activityId: string) => void;
  onStepsCommit: (entry: ProgramEntry, stepsText: string) => void;
  onAdd: (dayDate: string, blockKey: string | null, input: { activityId?: string | null; title: string; notes?: string | null }) => Promise<void>;
}) {
  const { setNodeRef } = useDroppable({ id: cellId(dayDate, blockKey), data: { type: "cell" } });
  return (
    <div ref={setNodeRef} className="min-h-[3rem] h-full space-y-2">
      <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        {entries.map((entry, idx) => (
          <SortableEntryCard
            key={entry.id}
            entry={entry}
            idx={idx}
            isLast={idx === entries.length - 1}
            blocks={blocks}
            activities={activities}
            onTextCommit={onTextCommit}
            onBlockChange={onBlockChange}
            onReorder={onReorder}
            onDelete={onDelete}
            onActivityLink={onActivityLink}
            onStepsCommit={onStepsCommit}
          />
        ))}
      </SortableContext>
      <AddEntryButton dayDate={dayDate} blockKey={blockKey} activities={activities} onAdd={onAdd} />
    </div>
  );
}

function SortableEntryCard({
  entry,
  idx,
  isLast,
  blocks,
  activities,
  onTextCommit,
  onBlockChange,
  onReorder,
  onDelete,
  onActivityLink,
  onStepsCommit,
}: {
  entry: ProgramEntry;
  idx: number;
  isLast: boolean;
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
    data: { type: "entry" },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-coral-light/60 bg-white p-1.5">
      <div className="flex items-start gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-0.5 shrink-0 cursor-grab touch-none text-xs text-ink/30 hover:text-coral-dark active:cursor-grabbing"
          title="Drag to reorder or move to another block"
        >
          ⠿
        </button>
        <div className="min-w-0 flex-1">
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
            <button type="button" disabled={isLast} onClick={() => onReorder(entry, "down")} className="shrink-0 text-[10px] text-ink/30 hover:text-coral-dark disabled:opacity-20" title="Move down">▼</button>
            <button type="button" onClick={() => onDelete(entry)} className="shrink-0 text-[10px] text-ink/30 hover:text-coral-dark" title="Remove">✕</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddEntryButton({
  dayDate,
  blockKey,
  activities,
  onAdd,
}: {
  dayDate: string;
  blockKey: string | null;
  activities: { id: string; title: string }[];
  onAdd: (dayDate: string, blockKey: string | null, input: { activityId?: string | null; title: string; notes?: string | null }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [activityId, setActivityId] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setOpen(false);
    setActivityId("");
    setTitle("");
    setNotes("");
  }

  function handleActivityPick(id: string) {
    setActivityId(id);
    if (id) {
      const picked = activities.find((a) => a.id === id);
      if (picked) setTitle(picked.title);
    }
  }

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    await onAdd(dayDate, blockKey, { activityId: activityId || null, title: trimmed, notes: notes.trim() || null });
    setSaving(false);
    reset();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-coral-light/70 px-2 py-1.5 text-[10px] font-medium text-ink/40 hover:border-coral hover:text-coral-dark"
      >
        + Add
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-coral-light/60 bg-white p-1.5">
      {activities.length > 0 && (
        <select
          value={activityId}
          onChange={(e) => handleActivityPick(e.target.value)}
          className="w-full rounded-md border border-coral-light/60 bg-white px-1 py-0.5 text-[10px] text-ink/60"
        >
          <option value="">Write freehand instead…</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
      )}
      <textarea
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        rows={2}
        placeholder="What's happening in this block…"
        className="mt-1 w-full resize-none rounded-md border-none bg-transparent p-0.5 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-coral"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={1}
        placeholder="Notes — flexible options, choices for the day…"
        className="mt-0.5 w-full resize-none rounded-md border-none bg-transparent p-0.5 text-[11px] text-ink/60 placeholder:text-ink/30 focus:outline-none focus:ring-1 focus:ring-coral"
      />
      <div className="mt-1 flex items-center justify-end gap-2">
        <button type="button" onClick={reset} className="text-[10px] text-ink/40 hover:text-coral-dark">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !title.trim()}
          className="rounded-full bg-coral px-2.5 py-0.5 text-[10px] font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}
