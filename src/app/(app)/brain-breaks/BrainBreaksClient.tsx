"use client";

import { useState } from "react";
import type { RawBrainBreak } from "@/lib/anthropic";

const AGE_GROUPS = [
  { value: "toddlers_1_2", label: "Toddlers 1–2" },
  { value: "toddlers_2_3", label: "Toddlers 2–3" },
  { value: "preschool_3_4", label: "Preschool 3–4" },
  { value: "preschool_4_5", label: "Preschool 4–5" },
  { value: "kindy_5_plus", label: "Kindy 5+" },
  { value: "mixed", label: "Mixed ages" },
];

const ROOM_ENERGIES = [
  { value: "too_high", label: "Too high", desc: "Loud, excited, chaotic — need to settle", icon: "🔥" },
  { value: "scattered", label: "Scattered", desc: "Fragmented attention — need to refocus", icon: "💭" },
  { value: "too_low", label: "Too low", desc: "Flat, disengaged — need energising", icon: "😴" },
];

const DURATIONS = [
  { value: 2, label: "2 min" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
];

const BREAK_TYPES = [
  { value: "any", label: "Surprise me", icon: "🎲" },
  { value: "movement", label: "Movement", icon: "🏃" },
  { value: "mindfulness", label: "Mindfulness", icon: "🌬️" },
  { value: "cognitive", label: "Quiz / Think", icon: "🧠" },
  { value: "creative", label: "Creative", icon: "🎨" },
  { value: "sensory", label: "Sensory", icon: "🖐️" },
];

const TYPE_STYLES: Record<string, { bg: string; border: string; badge: string; dot: string }> = {
  movement: {
    bg: "bg-coral-light/40",
    border: "border-coral-light",
    badge: "bg-coral-light text-coral-dark",
    dot: "bg-coral",
  },
  mindfulness: {
    bg: "bg-sage-light/40",
    border: "border-sage-light",
    badge: "bg-sage-light text-sage-dark",
    dot: "bg-sage",
  },
  cognitive: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-400",
  },
  creative: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-800",
    dot: "bg-purple-400",
  },
  sensory: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800",
    dot: "bg-blue-400",
  },
};

const IMPACT_LABELS: Record<string, { label: string; class: string }> = {
  settles: { label: "Settles energy", class: "bg-sage-light text-sage-dark" },
  energises: { label: "Energises group", class: "bg-amber-100 text-amber-800" },
  refocuses: { label: "Refocuses attention", class: "bg-coral-light text-coral-dark" },
};

const TYPE_ICONS: Record<string, string> = {
  movement: "🏃",
  mindfulness: "🌬️",
  cognitive: "🧠",
  creative: "🎨",
  sensory: "🖐️",
};

function pillClass(active: boolean) {
  return `rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "border-coral bg-coral-light text-coral-dark"
      : "border-coral-light/60 text-ink/60 hover:bg-coral-light/40 hover:text-ink"
  }`;
}

interface QuizQuestionProps {
  q: { question: string; options: string[]; answer: string };
  index: number;
}

function QuizQuestion({ q, index }: QuizQuestionProps) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm">
      <p className="font-medium text-ink">
        Q{index + 1}. {q.question}
      </p>
      {q.options.length > 0 && (
        <ul className="mt-2 space-y-1">
          {q.options.map((opt, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-300 text-[10px] font-bold text-amber-700">
                {String.fromCharCode(65 + i)}
              </span>
              <span className={opt === q.answer && revealed ? "font-semibold text-sage-dark" : "text-ink/70"}>
                {opt}
                {opt === q.answer && revealed && " ✓"}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="mt-2 text-xs font-medium text-amber-700 hover:underline"
      >
        {revealed ? "Hide answer" : "Reveal answer"}
      </button>
    </div>
  );
}

function BrainBreakCard({ b }: { b: RawBrainBreak }) {
  const style = TYPE_STYLES[b.type] ?? TYPE_STYLES.movement;
  const impact = IMPACT_LABELS[b.energy_impact];

  return (
    <div className={`rounded-2xl border ${style.border} ${style.bg} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl" aria-hidden>
            {TYPE_ICONS[b.type] ?? "⚡"}
          </span>
          <h3 className="font-display text-lg font-semibold text-ink leading-tight">{b.title}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${style.badge}`}>
            {b.type}
          </span>
          <span className="text-xs text-ink/50">~{b.duration_minutes} min</span>
        </div>
      </div>

      {/* Energy impact badge */}
      {impact && (
        <div className="px-5 pb-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${impact.class}`}>
            {b.energy_impact === "settles" && "↓"}
            {b.energy_impact === "energises" && "↑"}
            {b.energy_impact === "refocuses" && "→"} {impact.label}
          </span>
        </div>
      )}

      {/* Divider */}
      <div className={`border-t ${style.border}`} />

      {/* Instructions */}
      <div className="px-5 py-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink/40">Steps</p>
        <ol className="space-y-2">
          {b.instructions.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-ink">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${style.dot} text-[10px] font-bold text-white mt-0.5`}>
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Materials (if any) */}
      {b.materials_needed.length > 0 && (
        <div className={`border-t ${style.border} px-5 py-3`}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/40 mb-1">Materials needed</p>
          <p className="text-sm text-ink/70">{b.materials_needed.join(", ")}</p>
        </div>
      )}

      {/* Quiz questions */}
      {b.quiz_questions && b.quiz_questions.length > 0 && (
        <div className={`border-t ${style.border} px-5 py-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/40 mb-2">Pop quiz questions</p>
          <div className="space-y-2">
            {b.quiz_questions.map((q, i) => (
              <QuizQuestion key={i} q={q} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Discussion question */}
      {b.discussion_question && (
        <div className={`border-t ${style.border} px-5 py-3`}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/40 mb-1">Follow-up question</p>
          <p className="text-sm italic text-ink/80">&ldquo;{b.discussion_question}&rdquo;</p>
        </div>
      )}

      {/* Transition line */}
      <div className={`border-t ${style.border} px-5 py-4`}>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/40 mb-1.5">Bring them back</p>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-base" aria-hidden>🗣️</span>
          <p className="text-sm font-medium text-ink">&ldquo;{b.transition_line}&rdquo;</p>
        </div>
      </div>

      {/* EYLF connection (subtle footer) */}
      {b.eylf_connection && (
        <div className={`border-t ${style.border} px-5 py-2.5`}>
          <p className="text-[11px] text-ink/40">{b.eylf_connection}</p>
        </div>
      )}
    </div>
  );
}

export default function BrainBreaksClient() {
  const [ageGroup, setAgeGroup] = useState("preschool_3_4");
  const [roomEnergy, setRoomEnergy] = useState<"too_high" | "too_low" | "scattered">("scattered");
  const [duration, setDuration] = useState(5);
  const [breakType, setBreakType] = useState("any");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RawBrainBreak[]>([]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch("/api/brain-break", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ageGroup, roomEnergy, durationMinutes: duration, breakType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setResults(data.breaks ?? []);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-semibold text-coral-dark">Brain Breaks</h1>
        <p className="mt-2 text-sm text-ink/60">
          Quick games and activities that reset the room&rsquo;s energy and switch thinking modes — pick your group,
          the vibe, and how long you have, then get three ready-to-go ideas.
        </p>
      </div>

      {/* Form card */}
      <div className="mt-6 rounded-2xl border border-coral-light bg-white p-5 shadow-sm">
        {/* Age group */}
        <div>
          <p className="mb-2 text-sm font-semibold text-ink/70">Age group</p>
          <div className="flex flex-wrap gap-2">
            {AGE_GROUPS.map((ag) => (
              <button
                key={ag.value}
                type="button"
                onClick={() => setAgeGroup(ag.value)}
                className={pillClass(ageGroup === ag.value)}
              >
                {ag.label}
              </button>
            ))}
          </div>
        </div>

        {/* Room energy */}
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-ink/70">Room energy right now</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ROOM_ENERGIES.map((re) => (
              <button
                key={re.value}
                type="button"
                onClick={() => setRoomEnergy(re.value as typeof roomEnergy)}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  roomEnergy === re.value
                    ? "border-coral bg-coral-light text-coral-dark"
                    : "border-coral-light/60 text-ink/60 hover:bg-coral-light/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden>
                    {re.icon}
                  </span>
                  <span className="font-semibold text-sm">{re.label}</span>
                </div>
                <p className="mt-1 text-xs text-ink/50">{re.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Time available */}
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-ink/70">Time available</p>
          <div className="flex gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDuration(d.value)}
                className={pillClass(duration === d.value)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Break type */}
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-ink/70">Type of break</p>
          <div className="flex flex-wrap gap-2">
            {BREAK_TYPES.map((bt) => (
              <button
                key={bt.value}
                type="button"
                onClick={() => setBreakType(bt.value)}
                className={pillClass(breakType === bt.value)}
              >
                <span className="mr-1" aria-hidden>
                  {bt.icon}
                </span>
                {bt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="mt-6 w-full rounded-full bg-coral px-6 py-3 font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Generating brain breaks…" : "Generate brain breaks"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-coral-light bg-white p-5">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-coral-light/60" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-coral-light/60" />
                  <div className="h-3 w-1/4 rounded bg-coral-light/40" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-3 rounded bg-coral-light/40" style={{ width: `${70 + j * 10}%` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink/60">{results.length} brain break{results.length !== 1 ? "s" : ""} ready</p>
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-full border border-coral-light px-3 py-1 text-xs font-medium text-coral-dark hover:bg-coral-light/40"
            >
              Regenerate
            </button>
          </div>
          {results.map((b, i) => (
            <BrainBreakCard key={i} b={b} />
          ))}
        </div>
      )}
    </div>
  );
}
