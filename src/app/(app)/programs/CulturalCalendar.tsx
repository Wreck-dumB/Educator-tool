"use client";

import { useEffect, useState } from "react";
import type { CulturalDay } from "@/lib/types/database.types";

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

export default function CulturalCalendar({
  onDayClick,
}: {
  onDayClick: (date: string, events: CulturalDay[]) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [days, setDays] = useState<CulturalDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off a fetch on month change, not deriving state from props/state
    setLoading(true);
    setError(null);
    const start = toDateString(startOfMonth(year, month));
    const end = toDateString(endOfMonth(year, month));
    fetch(`/api/cultural-days?start=${start}&end=${end}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) setError(data.error ?? "Could not load cultural days");
        else setDays(data.days ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not reach the server");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  function changeMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  const first = startOfMonth(year, month);
  const last = endOfMonth(year, month);
  const leadingBlanks = first.getDay(); // 0 = Sunday
  const totalCells = leadingBlanks + last.getDate();
  const trailingBlanks = (7 - (totalCells % 7)) % 7;

  const daysByDate = new Map<string, CulturalDay[]>();
  for (const d of days) {
    const arr = daysByDate.get(d.date) ?? [];
    arr.push(d);
    daysByDate.set(d.date, arr);
  }

  const cells: { date: string | null; dayNum: number | null }[] = [
    ...Array.from({ length: leadingBlanks }, () => ({ date: null, dayNum: null })),
    ...Array.from({ length: last.getDate() }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return { date: toDateString(d), dayNum: i + 1 };
    }),
    ...Array.from({ length: trailingBlanks }, () => ({ date: null, dayNum: null })),
  ];

  return (
    <div className="rounded-2xl border border-coral-light bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="rounded-full px-2 py-1 text-sm font-medium text-ink/60 hover:bg-coral-light/40"
        >
          ← Prev
        </button>
        <p className="font-display text-sm font-semibold text-ink">
          {first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="rounded-full px-2 py-1 text-sm font-medium text-ink/60 hover:bg-coral-light/40"
        >
          Next →
        </button>
      </div>

      {loading && <p className="mt-2 text-xs text-ink/40">Looking up cultural &amp; national days…</p>}
      {error && <p className="mt-2 text-xs text-coral-dark">{error}</p>}

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-medium text-ink/40">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell.date) return <div key={idx} className="rounded-lg p-1" />;
          const events = daysByDate.get(cell.date) ?? [];
          const hasHigh = events.some((e) => e.confidence === "high");
          const hasApprox = events.some((e) => e.confidence === "approximate");
          return (
            <button
              key={idx}
              type="button"
              onClick={() => events.length > 0 && onDayClick(cell.date!, events)}
              disabled={events.length === 0}
              className={`min-h-14 rounded-lg p-1 text-left text-xs transition-colors ${
                events.length > 0
                  ? "cursor-pointer border border-coral-light bg-cream-dark/40 hover:border-coral"
                  : "text-ink/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink/70">{cell.dayNum}</span>
                {hasHigh && <span className="h-1.5 w-1.5 rounded-full bg-sage" aria-hidden />}
                {hasApprox && <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden />}
              </div>
              {events.length > 0 && (
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-ink/70">
                  {events[0].name}
                  {events.length > 1 && ` +${events.length - 1}`}
                </p>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-ink/40">
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-sage" /> confirmed date
        <span className="ml-3 mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber" /> verify exact date (lunar/moveable)
        <br />
        Click a highlighted day to use it for a new program.
      </p>
    </div>
  );
}
