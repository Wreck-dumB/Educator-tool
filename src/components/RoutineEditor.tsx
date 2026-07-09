"use client";

import { useReducer, useRef, useTransition } from "react";
import { saveRoutine } from "@/app/(app)/day-plan/actions";
import type { RoutineBlock } from "@/lib/types/database.types";

const BLOCK_TYPES: Record<RoutineBlock["type"], { label: string; color: string }> = {
  routine: { label: "Routine", color: "bg-ink/10 text-ink/70" },
  activity: { label: "Activity", color: "bg-sage-light text-sage-dark" },
  meal: { label: "Meal", color: "bg-amber-light text-amber-dark" },
  rest: { label: "Rest", color: "bg-cream-dark text-ink/60" },
  outdoor: { label: "Outdoor", color: "bg-sage-light/60 text-sage-dark" },
  transition: { label: "Transition", color: "bg-ink/5 text-ink/50" },
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function blankBlock(): RoutineBlock {
  return { id: makeId(), time: "09:00", title: "", duration_minutes: 30, type: "activity", notes: "" };
}

type Action =
  | { type: "set"; blocks: RoutineBlock[] }
  | { type: "update"; id: string; field: keyof RoutineBlock; value: string | number }
  | { type: "add" }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; dir: -1 | 1 };

function reducer(blocks: RoutineBlock[], action: Action): RoutineBlock[] {
  switch (action.type) {
    case "set":
      return action.blocks;
    case "update":
      return blocks.map((b) =>
        b.id === action.id ? { ...b, [action.field]: action.value } : b,
      );
    case "add":
      return [...blocks, blankBlock()];
    case "remove":
      return blocks.filter((b) => b.id !== action.id);
    case "move": {
      const idx = blocks.findIndex((b) => b.id === action.id);
      if (idx < 0) return blocks;
      const next = idx + action.dir;
      if (next < 0 || next >= blocks.length) return blocks;
      const arr = [...blocks];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    }
  }
}

interface Props {
  initialBlocks: RoutineBlock[];
  date: string;
  existingId?: string;
  existingTitle?: string;
  focusTopic?: string;
  notes?: string;
  // For AI generation context
  childCount: number;
  dayName: string;
  roomName?: string;
  plannedActivities: string[];
}

type GenState = "idle" | "generating" | "error";

export default function RoutineEditor({
  initialBlocks,
  date,
  existingId,
  existingTitle,
  focusTopic: initFocus,
  notes: initNotes,
  childCount,
  dayName,
  roomName,
  plannedActivities,
}: Props) {
  const [blocks, dispatch] = useReducer(reducer, initialBlocks);
  const [genState, setGenState] = useReducer((_: GenState, next: GenState) => next, "idle");
  const [genError, setGenError] = useReducer((_: string, next: string) => next, "");
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleGenerate() {
    setGenState("generating");
    setGenError("");
    try {
      const res = await fetch("/api/generate-routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, dayName, childCount, roomName, plannedActivities,
          focusTopic: (formRef.current?.querySelector<HTMLInputElement>('[name="focus_topic"]')?.value) || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      const rawBlocks: Omit<RoutineBlock, "id">[] = data.blocks;
      dispatch({ type: "set", blocks: rawBlocks.map((b) => ({ ...b, id: makeId() })) });
      setGenState("idle");
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Something went wrong");
      setGenState("error");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={genState === "generating"}
          className="flex items-center gap-1.5 rounded-full bg-sage px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sage-dark disabled:opacity-50"
        >
          {genState === "generating" ? (
            <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating…</>
          ) : (
            <><span aria-hidden>✨</span> Generate routine</>
          )}
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "add" })}
          className="rounded-full border border-coral-light px-3 py-1.5 text-sm font-medium text-coral-dark hover:bg-coral-light"
        >
          + Add block
        </button>
        {genState === "error" && <span className="text-xs text-coral-dark">{genError}</span>}
      </div>

      {/* Block list */}
      <div className="space-y-2">
        {blocks.length === 0 && (
          <p className="py-6 text-center text-sm text-ink/40">
            No blocks yet — generate a routine or add blocks manually.
          </p>
        )}
        {blocks.map((b, idx) => (
          <div key={b.id} className="rounded-xl border border-coral-light bg-white p-3">
            <div className="flex flex-wrap items-start gap-2">
              {/* Time */}
              <input
                type="time"
                value={b.time}
                onChange={(e) => dispatch({ type: "update", id: b.id, field: "time", value: e.target.value })}
                className="w-28 rounded-lg border border-coral-light px-2 py-1 text-sm font-mono text-ink focus:border-coral focus:outline-none"
              />
              {/* Type badge */}
              <select
                value={b.type}
                onChange={(e) => dispatch({ type: "update", id: b.id, field: "type", value: e.target.value })}
                className={`rounded-full border-0 px-2 py-1 text-xs font-semibold focus:outline-none ${BLOCK_TYPES[b.type].color}`}
              >
                {Object.entries(BLOCK_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              {/* Title */}
              <input
                type="text"
                value={b.title}
                onChange={(e) => dispatch({ type: "update", id: b.id, field: "title", value: e.target.value })}
                placeholder="Block title…"
                className="min-w-0 flex-1 rounded-lg border border-coral-light px-2 py-1 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
              />
              {/* Duration */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={b.duration_minutes}
                  min={5}
                  max={180}
                  step={5}
                  onChange={(e) => dispatch({ type: "update", id: b.id, field: "duration_minutes", value: parseInt(e.target.value) || 30 })}
                  className="w-16 rounded-lg border border-coral-light px-2 py-1 text-sm text-ink focus:border-coral focus:outline-none"
                />
                <span className="text-xs text-ink/40">min</span>
              </div>
              {/* Controls */}
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => dispatch({ type: "move", id: b.id, dir: -1 })} disabled={idx === 0} className="rounded px-1 py-0.5 text-xs text-ink/40 hover:text-ink/70 disabled:opacity-20">▲</button>
                <button type="button" onClick={() => dispatch({ type: "move", id: b.id, dir: 1 })} disabled={idx === blocks.length - 1} className="rounded px-1 py-0.5 text-xs text-ink/40 hover:text-ink/70 disabled:opacity-20">▼</button>
                <button type="button" onClick={() => dispatch({ type: "remove", id: b.id })} className="rounded px-1 py-0.5 text-xs text-coral-dark/50 hover:text-coral-dark">✕</button>
              </div>
            </div>
            {/* Notes */}
            <input
              type="text"
              value={b.notes ?? ""}
              onChange={(e) => dispatch({ type: "update", id: b.id, field: "notes", value: e.target.value })}
              placeholder="Notes for staff (optional)…"
              className="mt-2 w-full rounded-lg border border-coral-light/50 px-2 py-1 text-xs text-ink/70 placeholder-ink/20 focus:border-coral focus:outline-none"
            />
          </div>
        ))}
      </div>

      {/* Save form */}
      <form ref={formRef} action={saveRoutine} className="mt-5 space-y-3 border-t border-coral-light pt-5">
        <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
        <input type="hidden" name="date" value={date} />
        {existingId && <input type="hidden" name="existing_id" value={existingId} />}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Routine title</label>
            <input
              type="text"
              name="title"
              defaultValue={existingTitle ?? `Day Plan — ${date}`}
              className="w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm text-ink focus:border-coral focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Focus topic (optional)</label>
            <input
              type="text"
              name="focus_topic"
              defaultValue={initFocus ?? ""}
              placeholder="e.g. Colour theory, NAIDOC week…"
              className="w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Notes for casual staff (printed on plan)</label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={initNotes ?? ""}
            placeholder="e.g. Oliver leaves at 3pm · Mia is nut-free · fire drill at 11am"
            className="w-full resize-none rounded-xl border border-coral-light bg-white px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-dark"
          >
            Save day plan
          </button>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink/60">
            <input type="checkbox" name="is_template" value="1" className="accent-coral" />
            Save as reusable template
          </label>
        </div>
      </form>
    </div>
  );
}
