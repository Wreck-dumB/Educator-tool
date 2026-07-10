"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { RawBrainBreak } from "@/lib/anthropic";

// ── Form options ──────────────────────────────────────────────────────────────

const AGE_GROUPS = [
  { value: "toddlers_1_2", label: "Toddlers 1–2" },
  { value: "toddlers_2_3", label: "Toddlers 2–3" },
  { value: "preschool_3_4", label: "Preschool 3–4" },
  { value: "preschool_4_5", label: "Preschool 4–5" },
  { value: "kindy_5_plus", label: "Kindy 5+" },
  { value: "mixed", label: "Mixed ages" },
];

const ROOM_ENERGIES = [
  { value: "too_high", label: "Too high", desc: "Loud, excited or chaotic — need to settle", icon: "🔥" },
  { value: "scattered", label: "Scattered", desc: "Fragmented attention — need to refocus", icon: "💭" },
  { value: "too_low", label: "Too low", desc: "Flat or disengaged — need energising", icon: "😴" },
];

const DURATIONS = [
  { value: 2, label: "2 min" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
];

const BREAK_TYPES = [
  { value: "any", label: "Surprise me", icon: "🎲" },
  { value: "movement", label: "Movement", icon: "🏃" },
  { value: "mindfulness", label: "Breathing", icon: "🌬️" },
  { value: "cognitive", label: "Pop quiz", icon: "🧠" },
  { value: "creative", label: "Creative", icon: "🎨" },
  { value: "sensory", label: "Sensory", icon: "🖐️" },
];

// ── Visual config per type ────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  movement: "🏃",
  mindfulness: "🌬️",
  cognitive: "🧠",
  creative: "🎨",
  sensory: "🖐️",
};

const TYPE_CARD: Record<string, { border: string; badge: string; launch: string }> = {
  movement:   { border: "border-coral-light",  badge: "bg-coral-light text-coral-dark",     launch: "bg-coral" },
  mindfulness:{ border: "border-sage-light",   badge: "bg-sage-light text-sage-dark",       launch: "bg-sage-dark" },
  cognitive:  { border: "border-amber-200",    badge: "bg-amber-100 text-amber-800",        launch: "bg-amber-500" },
  creative:   { border: "border-purple-200",   badge: "bg-purple-100 text-purple-800",      launch: "bg-purple-600" },
  sensory:    { border: "border-blue-200",     badge: "bg-blue-100 text-blue-800",          launch: "bg-blue-600" },
};

const TYPE_PLAY_BG: Record<string, string> = {
  movement:   "bg-coral",
  mindfulness:"bg-sage-dark",
  cognitive:  "bg-amber-500",
  creative:   "bg-purple-600",
  sensory:    "bg-blue-600",
};

const IMPACT_LABELS: Record<string, { label: string; badge: string }> = {
  settles:   { label: "Settles energy",     badge: "bg-sage-light text-sage-dark" },
  energises: { label: "Energises group",    badge: "bg-amber-100 text-amber-800" },
  refocuses: { label: "Refocuses attention", badge: "bg-coral-light text-coral-dark" },
};

const IMPACT_ARROW: Record<string, string> = { settles: "↓", energises: "↑", refocuses: "→" };

function pillClass(active: boolean) {
  return `rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "border-coral bg-coral-light text-coral-dark"
      : "border-coral-light/60 text-ink/60 hover:bg-coral-light/40 hover:text-ink"
  }`;
}

// ── Play mode: Movement ───────────────────────────────────────────────────────

function MovementPlayer({ b, onDone }: { b: RawBrainBreak; onDone: () => void }) {
  const actions = b.actions ?? [];
  const [idx, setIdx] = useState(-1); // -1 = ready screen

  if (idx === -1) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-8">
        <p className="text-7xl">🏃</p>
        <p className="text-4xl font-bold text-white">{b.title}</p>
        <p className="text-white/70 text-lg max-w-sm">{b.screen_intro}</p>
        <p className="text-white/50 text-sm">{actions.length} moves · tap to advance</p>
        <button onClick={() => setIdx(0)} className="mt-4 rounded-full bg-white text-coral font-bold px-12 py-4 text-xl shadow-lg hover:scale-105 transition-transform">
          Let&rsquo;s go! →
        </button>
      </div>
    );
  }

  if (idx >= actions.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
        <p className="text-7xl animate-bounce">🎉</p>
        <p className="text-4xl font-bold text-white">Amazing work!</p>
        <p className="text-white/70 text-lg">Brain break complete.</p>
        {b.transition_line && (
          <div className="mt-4 rounded-2xl bg-white/10 px-6 py-4 max-w-lg text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">Educator &mdash; bring them back</p>
            <p className="text-white font-medium">&ldquo;{b.transition_line}&rdquo;</p>
          </div>
        )}
        <button onClick={onDone} className="mt-4 rounded-full bg-white text-coral font-bold px-10 py-3 text-lg hover:scale-105 transition-transform">
          All done!
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-white/40">
        {idx + 1} of {actions.length}
      </p>
      <p className="text-5xl sm:text-7xl font-extrabold text-white leading-tight drop-shadow-lg">
        {actions[idx]}
      </p>
      <button
        onClick={() => setIdx((i) => i + 1)}
        className="mt-6 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white font-bold px-12 py-5 text-2xl transition-all border-2 border-white/30"
      >
        Done! &rarr;
      </button>
    </div>
  );
}

// ── Play mode: Mindfulness / Breathing ────────────────────────────────────────

type BreathStep = { label: string; count: number; big: boolean; cycle: number };

function buildBreathSequence(b: NonNullable<RawBrainBreak["breathing"]>): BreathStep[] {
  const steps: BreathStep[] = [];
  for (let c = 1; c <= b.cycles; c++) {
    for (let i = b.inhale_seconds; i >= 1; i--)
      steps.push({ label: "Breathe in", count: i, big: true, cycle: c });
    for (let i = b.hold_seconds; i >= 1; i--)
      steps.push({ label: "Hold…", count: i, big: true, cycle: c });
    for (let i = b.exhale_seconds; i >= 1; i--)
      steps.push({ label: "Breathe out", count: i, big: false, cycle: c });
    if (c < b.cycles) steps.push({ label: "", count: 1, big: false, cycle: c });
  }
  return steps;
}

function BreathingPlayer({ b, onDone }: { b: RawBrainBreak; onDone: () => void }) {
  const breathing = b.breathing ?? { inhale_seconds: 4, hold_seconds: 2, exhale_seconds: 4, cycles: 5 };
  const sequence = useMemo(() => buildBreathSequence(breathing), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [started, setStarted] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!started || finished) return;
    const t = setInterval(() => {
      setStepIdx((i) => {
        if (i + 1 >= sequence.length) {
          setFinished(true);
          return i;
        }
        return i + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started, finished, sequence]);

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-8">
        <p className="text-7xl">🌬️</p>
        <p className="text-4xl font-bold text-white">{b.title}</p>
        <p className="text-white/70 text-lg max-w-sm">{b.screen_intro}</p>
        <p className="text-white/50 text-sm">{breathing.cycles} breath cycles</p>
        <button onClick={() => setStarted(true)} className="mt-4 rounded-full bg-white text-sage-dark font-bold px-12 py-4 text-xl shadow-lg hover:scale-105 transition-transform">
          Begin &rarr;
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
        <p className="text-7xl">🌿</p>
        <p className="text-4xl font-bold text-white">Well done.</p>
        <p className="text-white/70 text-lg">Notice how calm your body feels.</p>
        {b.transition_line && (
          <div className="mt-4 rounded-2xl bg-white/10 px-6 py-4 max-w-lg text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">Educator &mdash; bring them back</p>
            <p className="text-white font-medium">&ldquo;{b.transition_line}&rdquo;</p>
          </div>
        )}
        <button onClick={onDone} className="mt-4 rounded-full bg-white text-sage-dark font-bold px-10 py-3 text-lg hover:scale-105 transition-transform">
          All done
        </button>
      </div>
    );
  }

  const step = sequence[stepIdx];
  const isBig = step?.big ?? false;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-8">
      {/* Animated circle */}
      <div
        className="rounded-full bg-white/20 border-4 border-white/50 flex items-center justify-center transition-all ease-in-out"
        style={{
          width: isBig ? 240 : 80,
          height: isBig ? 240 : 80,
          transitionDuration: isBig ? `${breathing.inhale_seconds}s` : `${breathing.exhale_seconds}s`,
        }}
      >
        {isBig && <span className="text-white/40 text-4xl">○</span>}
      </div>

      <div className="space-y-1">
        {step?.label && <p className="text-4xl font-bold text-white">{step.label}</p>}
        {(step?.count ?? 0) > 0 && <p className="text-3xl text-white/60">{step?.count}</p>}
      </div>

      {breathing.mantra && (
        <p className="text-white/40 italic text-sm">{breathing.mantra}</p>
      )}

      <p className="text-white/25 text-xs">Cycle {step?.cycle ?? 1} of {breathing.cycles}</p>
    </div>
  );
}

// ── Play mode: Pop Quiz ───────────────────────────────────────────────────────

function QuizPlayer({ b, onDone }: { b: RawBrainBreak; onDone: () => void }) {
  const questions = b.quiz_questions ?? [];
  const [qIdx, setQIdx] = useState(-1); // -1 = ready screen
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[qIdx];

  function pick(opt: string) {
    if (selected || qIdx < 0) return;
    setSelected(opt);
    if (opt === q?.answer) setScore((s) => s + 1);
  }

  function next() {
    if (qIdx + 1 >= questions.length) {
      setDone(true);
    } else {
      setQIdx((i) => i + 1);
      setSelected(null);
    }
  }

  if (qIdx === -1) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-8">
        <p className="text-7xl">🧠</p>
        <p className="text-4xl font-bold text-white">{b.title}</p>
        <p className="text-white/70 text-lg max-w-sm">{b.screen_intro}</p>
        <p className="text-white/50 text-sm">{questions.length} questions</p>
        <button onClick={() => setQIdx(0)} className="mt-4 rounded-full bg-white text-amber-700 font-bold px-12 py-4 text-xl shadow-lg hover:scale-105 transition-transform">
          Start quiz! &rarr;
        </button>
      </div>
    );
  }

  if (done || questions.length === 0) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
        <p className="text-7xl animate-bounce">{pct === 100 ? "🏆" : pct >= 60 ? "⭐" : "🎉"}</p>
        <p className="text-5xl font-extrabold text-white">{score}/{questions.length}</p>
        <p className="text-xl text-white/80">
          {pct === 100 ? "Perfect score! Brilliant brains!" : pct >= 60 ? "Great work, champions!" : "Well tried, everyone!"}
        </p>
        {b.transition_line && (
          <div className="mt-4 rounded-2xl bg-white/10 px-6 py-4 max-w-lg text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">Educator &mdash; bring them back</p>
            <p className="text-white font-medium">&ldquo;{b.transition_line}&rdquo;</p>
          </div>
        )}
        <button onClick={onDone} className="mt-4 rounded-full bg-white text-amber-700 font-bold px-10 py-3 text-lg hover:scale-105 transition-transform">
          All done!
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-6 max-w-2xl mx-auto w-full">
      <p className="text-sm font-semibold uppercase tracking-widest text-white/50">
        Question {qIdx + 1} of {questions.length}
      </p>
      <p className="text-3xl sm:text-4xl font-extrabold text-white text-center leading-tight">
        {q?.question}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-2">
        {q?.options.map((opt, i) => {
          let cls =
            "rounded-2xl border-2 px-5 py-4 text-lg font-semibold text-left transition-all active:scale-95 ";
          if (!selected) {
            cls += "border-white/30 bg-white/10 text-white hover:bg-white/25 hover:border-white/60 cursor-pointer";
          } else if (opt === q.answer) {
            cls += "border-green-400 bg-green-400/30 text-white scale-[1.02]";
          } else if (opt === selected) {
            cls += "border-red-400 bg-red-400/20 text-white/60";
          } else {
            cls += "border-white/10 bg-white/5 text-white/30";
          }
          return (
            <button key={i} onClick={() => pick(opt)} disabled={!!selected} className={cls}>
              <span className="mr-2 text-white/40">{String.fromCharCode(65 + i)}.</span>
              {opt}
              {selected && opt === q.answer && <span className="ml-2">✓</span>}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="w-full text-center space-y-2 mt-1">
          <p className="text-xl font-bold text-white">
            {selected === q?.answer ? "✓ Correct! 🎉" : `✗ The answer was: ${q?.answer}`}
          </p>
          {q?.fun_fact && (
            <p className="text-sm text-white/70 italic px-4">{q.fun_fact}</p>
          )}
          <button
            onClick={next}
            className="mt-2 rounded-full bg-white/20 hover:bg-white/35 text-white font-bold px-10 py-3 text-base transition-colors active:scale-95"
          >
            {qIdx + 1 >= questions.length ? "See results →" : "Next question →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Play mode: Creative ───────────────────────────────────────────────────────

function CreativePlayer({ b, onDone }: { b: RawBrainBreak; onDone: () => void }) {
  const [phase, setPhase] = useState<"ready" | "prompt" | "question" | "done">("ready");
  const totalSecs = (b.duration_minutes ?? 2) * 60;
  const [timeLeft, setTimeLeft] = useState(totalSecs);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startTimer() {
    setPhase("prompt");
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase(b.discussion_question ? "question" : "done");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  if (phase === "ready") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-8">
        <p className="text-7xl">🎨</p>
        <p className="text-4xl font-bold text-white">{b.title}</p>
        <p className="text-white/70 text-lg max-w-sm">{b.screen_intro}</p>
        <button onClick={startTimer} className="mt-4 rounded-full bg-white text-purple-700 font-bold px-12 py-4 text-xl shadow-lg hover:scale-105 transition-transform">
          Let&rsquo;s go! &rarr;
        </button>
      </div>
    );
  }

  if (phase === "prompt") {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-8 max-w-2xl mx-auto w-full">
        <p className="text-3xl sm:text-5xl font-extrabold text-white leading-tight">
          {b.creative_prompt ?? b.screen_intro}
        </p>
        <div className="text-3xl font-mono text-white/50">
          {mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs}s`}
        </div>
        {b.discussion_question && (
          <button
            onClick={() => { clearInterval(timerRef.current!); setPhase("question"); }}
            className="rounded-full bg-white/20 hover:bg-white/35 text-white font-bold px-10 py-3 transition-colors"
          >
            Skip to question &rarr;
          </button>
        )}
      </div>
    );
  }

  if (phase === "question") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-8 max-w-2xl mx-auto">
        <p className="text-3xl text-white/60 font-semibold">Now let&rsquo;s think&hellip;</p>
        <p className="text-4xl sm:text-5xl font-extrabold text-white leading-snug">
          &ldquo;{b.discussion_question}&rdquo;
        </p>
        <button onClick={() => setPhase("done")} className="mt-4 rounded-full bg-white/20 hover:bg-white/35 text-white font-bold px-10 py-3 transition-colors">
          Continue &rarr;
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
      <p className="text-7xl">✨</p>
      <p className="text-4xl font-bold text-white">Great creativity!</p>
      {b.transition_line && (
        <div className="mt-4 rounded-2xl bg-white/10 px-6 py-4 max-w-lg text-left">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">Educator &mdash; bring them back</p>
          <p className="text-white font-medium">&ldquo;{b.transition_line}&rdquo;</p>
        </div>
      )}
      <button onClick={onDone} className="mt-4 rounded-full bg-white text-purple-700 font-bold px-10 py-3 text-lg hover:scale-105 transition-transform">
        All done!
      </button>
    </div>
  );
}

// ── Play mode: Sensory ────────────────────────────────────────────────────────

function SensoryPlayer({ b, onDone }: { b: RawBrainBreak; onDone: () => void }) {
  const steps = b.sensory_steps ?? [];
  const [idx, setIdx] = useState(-1);

  if (idx === -1) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-8">
        <p className="text-7xl">🖐️</p>
        <p className="text-4xl font-bold text-white">{b.title}</p>
        <p className="text-white/70 text-lg max-w-sm">{b.screen_intro}</p>
        <p className="text-white/50 text-sm">{steps.length} steps · tap to advance</p>
        <button onClick={() => setIdx(0)} className="mt-4 rounded-full bg-white text-blue-700 font-bold px-12 py-4 text-xl shadow-lg hover:scale-105 transition-transform">
          Begin &rarr;
        </button>
      </div>
    );
  }

  if (idx >= steps.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
        <p className="text-7xl">🌟</p>
        <p className="text-4xl font-bold text-white">Wonderful!</p>
        {b.discussion_question && (
          <p className="text-2xl text-white/70 italic max-w-lg">&ldquo;{b.discussion_question}&rdquo;</p>
        )}
        {b.transition_line && (
          <div className="mt-4 rounded-2xl bg-white/10 px-6 py-4 max-w-lg text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">Educator &mdash; bring them back</p>
            <p className="text-white font-medium">&ldquo;{b.transition_line}&rdquo;</p>
          </div>
        )}
        <button onClick={onDone} className="mt-4 rounded-full bg-white text-blue-700 font-bold px-10 py-3 text-lg hover:scale-105 transition-transform">
          All done!
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-8 max-w-2xl mx-auto w-full">
      <p className="text-sm font-semibold uppercase tracking-widest text-white/40">{idx + 1} / {steps.length}</p>
      <p className="text-3xl sm:text-5xl font-extrabold text-white leading-tight">{steps[idx]}</p>
      <button
        onClick={() => setIdx((i) => i + 1)}
        className="mt-4 rounded-full bg-white/20 hover:bg-white/35 active:scale-95 text-white font-bold px-12 py-4 text-xl transition-all border-2 border-white/30"
      >
        Next &rarr;
      </button>
    </div>
  );
}

// ── Full-screen play overlay ──────────────────────────────────────────────────

function PlayOverlay({ b, onClose }: { b: RawBrainBreak; onClose: () => void }) {
  const bg = TYPE_PLAY_BG[b.type] ?? "bg-coral";

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${bg}`} style={{ fontFamily: "inherit" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>{TYPE_ICONS[b.type]}</span>
          <span className="text-white font-bold text-lg">{b.title}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-full bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 text-sm transition-colors"
        >
          ✕ Exit
        </button>
      </div>

      {/* Interactive content */}
      <div className="flex-1 overflow-auto">
        {b.type === "movement"    && <MovementPlayer    b={b} onDone={onClose} />}
        {b.type === "mindfulness" && <BreathingPlayer   b={b} onDone={onClose} />}
        {b.type === "cognitive"   && <QuizPlayer        b={b} onDone={onClose} />}
        {b.type === "creative"    && <CreativePlayer    b={b} onDone={onClose} />}
        {b.type === "sensory"     && <SensoryPlayer     b={b} onDone={onClose} />}
      </div>
    </div>
  );
}

// ── Preview card ──────────────────────────────────────────────────────────────

function BrainBreakCard({ b, onLaunch }: { b: RawBrainBreak; onLaunch: () => void }) {
  const card = TYPE_CARD[b.type] ?? TYPE_CARD.movement;
  const impact = IMPACT_LABELS[b.energy_impact];

  const meta: string[] = [];
  if (b.type === "cognitive" && b.quiz_questions) meta.push(`${b.quiz_questions.length} questions`);
  if (b.type === "movement" && b.actions) meta.push(`${b.actions.length} moves`);
  if (b.type === "mindfulness" && b.breathing) meta.push(`${b.breathing.cycles} breath cycles`);
  if (b.type === "sensory" && b.sensory_steps) meta.push(`${b.sensory_steps.length} steps`);

  return (
    <div className={`rounded-2xl border ${card.border} bg-white overflow-hidden`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl" aria-hidden>{TYPE_ICONS[b.type]}</span>
            <h3 className="font-display text-lg font-semibold text-ink leading-tight">{b.title}</h3>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${card.badge}`}>
              {b.type === "cognitive" ? "pop quiz" : b.type === "mindfulness" ? "breathing" : b.type}
            </span>
            <span className="text-xs text-ink/40">~{b.duration_minutes} min</span>
          </div>
        </div>

        <p className="mt-2 text-sm text-ink/60">{b.screen_intro}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {impact && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${impact.badge}`}>
              {IMPACT_ARROW[b.energy_impact]} {impact.label}
            </span>
          )}
          {meta.map((m) => (
            <span key={m} className="text-xs text-ink/40">{m}</span>
          ))}
        </div>

        {b.eylf_connection && (
          <p className="mt-3 text-[11px] text-ink/30">{b.eylf_connection}</p>
        )}
      </div>

      <div className={`border-t ${card.border} p-4`}>
        <button
          onClick={onLaunch}
          className={`w-full rounded-full py-3 font-bold text-white text-base hover:opacity-90 active:scale-95 transition-all ${card.launch}`}
        >
          Launch on screen →
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BrainBreaksClient() {
  const [ageGroup, setAgeGroup] = useState("preschool_3_4");
  const [roomEnergy, setRoomEnergy] = useState<"too_high" | "too_low" | "scattered">("scattered");
  const [duration, setDuration] = useState(5);
  const [breakType, setBreakType] = useState("any");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RawBrainBreak[]>([]);
  const [playing, setPlaying] = useState<RawBrainBreak | null>(null);

  async function generate() {
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
      if (!res.ok) setError(data.error ?? "Something went wrong");
      else setResults(data.breaks ?? []);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Full-screen play overlay */}
      {playing && <PlayOverlay b={playing} onClose={() => setPlaying(null)} />}

      <div className="mx-auto max-w-2xl">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">Brain Breaks</h1>
          <p className="mt-2 text-sm text-ink/60">
            Interactive, on-screen games that reset the room&rsquo;s energy and switch thinking modes.
            Pick your group and the vibe, then launch the activity straight onto the screen &mdash; no paper, no prep.
          </p>
        </div>

        {/* Form */}
        <div className="mt-6 rounded-2xl border border-coral-light bg-white p-5 shadow-sm">
          {/* Age group */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink/70">Age group</p>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map((ag) => (
                <button key={ag.value} type="button" onClick={() => setAgeGroup(ag.value)} className={pillClass(ageGroup === ag.value)}>
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
                    <span className="text-lg" aria-hidden>{re.icon}</span>
                    <span className="font-semibold text-sm">{re.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink/50">{re.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-ink/70">Time available</p>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button key={d.value} type="button" onClick={() => setDuration(d.value)} className={pillClass(duration === d.value)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-ink/70">Type of break</p>
            <div className="flex flex-wrap gap-2">
              {BREAK_TYPES.map((bt) => (
                <button key={bt.value} type="button" onClick={() => setBreakType(bt.value)} className={pillClass(breakType === bt.value)}>
                  <span className="mr-1" aria-hidden>{bt.icon}</span>
                  {bt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="mt-6 w-full rounded-full bg-coral px-6 py-3 font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60 text-base"
          >
            {loading ? "Generating…" : "Generate brain breaks"}
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
                    <div className="h-4 rounded bg-coral-light/60" style={{ width: `${40 + i * 15}%` }} />
                    <div className="h-3 rounded bg-coral-light/40" style={{ width: `${60 + i * 10}%` }} />
                  </div>
                </div>
                <div className="mt-5 h-10 rounded-full bg-coral-light/30" />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink/50">{results.length} brain break{results.length !== 1 ? "s" : ""} ready</p>
              <button
                type="button"
                onClick={generate}
                className="rounded-full border border-coral-light px-3 py-1 text-xs font-medium text-coral-dark hover:bg-coral-light/40"
              >
                Regenerate
              </button>
            </div>
            {results.map((b, i) => (
              <BrainBreakCard key={i} b={b} onLaunch={() => setPlaying(b)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
