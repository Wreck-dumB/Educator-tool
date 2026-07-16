"use client";

import { useState, useMemo } from "react";
import {
  detectPrintTemplate,
  buildWorksheetUrl,
  TEMPLATE_LABELS,
  TEMPLATE_DESCRIPTIONS,
  TEMPLATE_COLOURS,
  type PrintTemplateType,
} from "@/lib/utils/printable";
import { getEnergyIcon, getGroupIcon } from "@/lib/icons";
import type { ActivityWithOutcomes } from "@/lib/supabase/activities";

const TEMPLATE_OPTIONS: PrintTemplateType[] = [
  "activity_sheet",
  "drawing_frame",
  "writing_lines",
  "name_trace",
  "instructions",
];

export default function WorksheetGenerator({
  activities,
}: {
  activities: ActivityWithOutcomes[];
}) {
  const [search, setSearch] = useState("");
  const [childName, setChildName] = useState("");
  // Per-activity template overrides: activityId → PrintTemplateType
  const [overrides, setOverrides] = useState<Record<string, PrintTemplateType>>({});

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return activities;
    return activities.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary?.toLowerCase().includes(q) ||
        a.eylf_codes.some((c) => c.includes(q)),
    );
  }, [activities, search]);

  function templateFor(a: ActivityWithOutcomes): PrintTemplateType {
    return overrides[a.id] ?? detectPrintTemplate(a);
  }

  function openPrintable(a: ActivityWithOutcomes) {
    const type = templateFor(a);
    const url = buildWorksheetUrl(type, a, childName || undefined);
    window.open(url, "_blank");
  }

  if (activities.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-ink/40">
        No saved activities yet — generate some first from the{" "}
        <a href="/generate" className="font-medium text-coral-dark hover:underline">
          Generate Activity
        </a>{" "}
        page.
      </p>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
            Search activities
          </label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, summary, or EYLF code…"
            className="w-full rounded-xl border border-coral-light bg-white px-4 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          />
        </div>
        <div className="sm:w-56">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
            Child name (optional)
          </label>
          <input
            type="text"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="Printed on each sheet"
            className="w-full rounded-xl border border-coral-light bg-white px-4 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 text-center text-sm text-ink/40">No activities match &quot;{search}&quot;</p>
      )}

      {/* Activity list */}
      <div className="mt-4 divide-y divide-coral-light rounded-2xl border border-coral-light bg-white">
        {filtered.map((a) => {
          const detected = detectPrintTemplate(a);
          const current = overrides[a.id] ?? detected;
          const isOverridden = !!overrides[a.id] && overrides[a.id] !== detected;

          return (
            <div key={a.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
              {/* Activity info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{a.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {a.energy_level && (
                    <span className="text-xs text-ink/40">
                      {getEnergyIcon(a.energy_level)} {a.energy_level}
                    </span>
                  )}
                  {a.group_size_fit && (
                    <span className="text-xs text-ink/40">
                      {getGroupIcon(a.group_size_fit)} {a.group_size_fit.replace("_", " ")}
                    </span>
                  )}
                  {a.duration_minutes && (
                    <span className="text-xs text-ink/40">{a.duration_minutes} min</span>
                  )}
                  {a.eylf_codes.slice(0, 3).map((c) => (
                    <span key={c} className="rounded-full bg-sage-light px-1.5 py-0.5 text-xs text-sage-dark">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Template selector */}
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex flex-col items-end gap-1">
                  <select
                    value={current}
                    onChange={(e) =>
                      setOverrides((prev) => ({
                        ...prev,
                        [a.id]: e.target.value as PrintTemplateType,
                      }))
                    }
                    className="rounded-xl border border-coral-light bg-white px-3 py-1.5 text-sm text-ink focus:border-coral focus:outline-none"
                    title={TEMPLATE_DESCRIPTIONS[current]}
                  >
                    {TEMPLATE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {TEMPLATE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TEMPLATE_COLOURS[current]}`}
                    >
                      {isOverridden ? "changed" : "auto-detected"}
                    </span>
                    {isOverridden && (
                      <button
                        type="button"
                        onClick={() =>
                          setOverrides((prev) => {
                            const next = { ...prev };
                            delete next[a.id];
                            return next;
                          })
                        }
                        className="text-[10px] text-ink/30 hover:text-ink/60"
                      >
                        reset
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openPrintable(a)}
                  className="shrink-0 rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral-dark"
                >
                  🖨 Print
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Template legend */}
      <div className="mt-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink/40">
          Template types
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TEMPLATE_OPTIONS.map((t) => (
            <div key={t} className="flex items-start gap-2">
              <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TEMPLATE_COLOURS[t]}`}>
                {TEMPLATE_LABELS[t]}
              </span>
              <p className="text-xs text-ink/50">{TEMPLATE_DESCRIPTIONS[t]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
