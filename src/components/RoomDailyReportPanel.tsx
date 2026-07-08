"use client";

import { useState, useTransition } from "react";

interface Report {
  roomName: string;
  date: string;
  attendance_summary: string;
  highlights: string[];
  learning_and_development: string;
  care_and_wellbeing: string;
  suggestions_for_tomorrow: string[];
  closing_note: string;
}

export default function RoomDailyReportPanel({ roomId, roomName }: { roomId: string; roomName: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/room-daily-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, date: today }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to generate report");
          return;
        }
        setReport(data as Report);
      } catch {
        setError("Network error — please try again");
      }
    });
  }

  function handlePrint() {
    window.print();
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink/60">
          Generate a summary of today in {roomName} — attendance, observations, learning themes, and
          a closing note suitable for sharing with families or the director.
        </p>
        {error && (
          <p className="rounded-xl bg-coral-light px-4 py-3 text-sm text-coral-dark">{error}</p>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-dark transition-colors disabled:opacity-50"
        >
          {isPending ? "Generating…" : "Generate today's report"}
        </button>
      </div>
    );
  }

  const dateLabel = new Date(report.date + "T12:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">{report.roomName} — {dateLabel}</h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-full border border-coral-light px-3 py-1.5 text-xs font-semibold text-ink/60 hover:border-coral transition-colors"
          >
            Print
          </button>
          <button
            type="button"
            onClick={() => setReport(null)}
            className="rounded-full border border-coral-light px-3 py-1.5 text-xs font-semibold text-ink/60 hover:border-coral transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">{report.roomName} — Daily Summary</h1>
        <p className="text-sm text-gray-500">{dateLabel}</p>
      </div>

      <div className="rounded-2xl border border-coral-light bg-white p-5 shadow-sm space-y-5 print:border-0 print:shadow-none print:p-0">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-ink/40">Attendance</h3>
          <p className="mt-1 text-sm text-ink/80">{report.attendance_summary}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-ink/40">Highlights</h3>
          <ul className="mt-2 space-y-1.5">
            {report.highlights.map((h, i) => (
              <li key={i} className="flex gap-2 text-sm text-ink/80">
                <span className="mt-0.5 shrink-0 text-coral-dark">•</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-ink/40">Learning &amp; development</h3>
          <p className="mt-1 text-sm text-ink/80">{report.learning_and_development}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-ink/40">Care &amp; wellbeing</h3>
          <p className="mt-1 text-sm text-ink/80">{report.care_and_wellbeing}</p>
        </div>

        {report.suggestions_for_tomorrow.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink/40">Tomorrow</h3>
            <ul className="mt-2 space-y-1.5">
              {report.suggestions_for_tomorrow.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink/80">
                  <span className="mt-0.5 shrink-0 text-sage-dark">→</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl bg-sage-light px-4 py-3">
          <p className="text-sm italic text-sage-dark">{report.closing_note}</p>
        </div>
      </div>

      <p className="text-xs text-ink/40 print:hidden">
        AI-generated from today&apos;s attendance, observations, and incident data. Review before sharing.
      </p>
    </div>
  );
}
