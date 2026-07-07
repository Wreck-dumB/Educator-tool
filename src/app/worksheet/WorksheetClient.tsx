"use client";

import { useState, useMemo } from "react";

type TemplateType = "name_trace" | "drawing_frame" | "activity_sheet";

interface Props {
  type: TemplateType;
  initialName: string;
  title: string;
  steps?: string[];
  materials?: string[];
}

function pickFontSize(nameLength: number, maxWidth: number): number {
  for (const size of [90, 76, 64, 52, 42, 34, 28]) {
    if (nameLength * 0.58 * size <= maxWidth) return size;
  }
  return 24;
}

// ─── TraceRow ────────────────────────────────────────────────────────────────
interface TraceRowProps {
  y: number;
  fill: string;
  label?: string;
  showText?: boolean;
  name: string;
  fontSize: number;
  capHeight: number;
  xHeight: number;
  descender: number;
  svgWidth: number;
}

function TraceRow({
  y, fill, label, showText = true,
  name, fontSize, capHeight, xHeight, descender, svgWidth,
}: TraceRowProps) {
  const baseline = y + capHeight + 8;
  const midLine   = baseline - xHeight;
  const topLine   = baseline - capHeight;
  const descLine  = baseline + descender;

  return (
    <>
      {label && (
        <text x="0" y={y - 2} fontSize="10" fill="#aaa"
          fontFamily="Arial, Helvetica, sans-serif" style={{ userSelect: "none" }}>
          {label}
        </text>
      )}
      <line x1="0" y1={topLine}  x2={svgWidth} y2={topLine}  stroke="#d8d8d8" strokeWidth="0.8" strokeDasharray="4 3" />
      <line x1="0" y1={midLine}  x2={svgWidth} y2={midLine}  stroke="#e2e2e2" strokeWidth="0.8" strokeDasharray="4 3" />
      <line x1="0" y1={baseline} x2={svgWidth} y2={baseline} stroke="#b0b0b0" strokeWidth="1" />
      <line x1="0" y1={descLine} x2={svgWidth} y2={descLine} stroke="#e8e8e8" strokeWidth="0.6" />
      {showText && (
        <text x="4" y={baseline} fontSize={fontSize} fontWeight="bold"
          fontFamily="Arial, Helvetica, sans-serif" fill={fill} style={{ userSelect: "none" }}>
          {name}
        </text>
      )}
    </>
  );
}

// ─── Name Tracing Template (pure display — no inputs inside) ─────────────────
function NameTraceTemplate({ name, title }: { name: string; title: string }) {
  const displayName = name.trim() || "Name";
  const svgWidth = 760;

  const fontSize = useMemo(
    () => pickFontSize(displayName.length, svgWidth - 20),
    [displayName.length],
  );

  const capHeight  = fontSize * 0.72;
  const xHeight    = fontSize * 0.52;
  const descender  = fontSize * 0.22;
  const lineHeight = fontSize * 1.45;
  const rowSpacing = lineHeight + 24;

  const row1Y = 56;
  const row2Y = row1Y + rowSpacing;
  const row3Y = row2Y + rowSpacing;
  const svgHeight = row3Y + lineHeight + 40;

  const shared = { name: displayName, fontSize, capHeight, xHeight, descender, svgWidth };

  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 print:px-0 print:py-4">
      <div className="mb-4 border-b border-ink/10 pb-3">
        <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
        {name.trim() && (
          <p className="mt-0.5 text-sm text-ink/50">For <strong>{name.trim()}</strong></p>
        )}
      </div>

      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%"
        aria-label={`Name tracing worksheet for ${displayName}`} style={{ display: "block" }}>
        <TraceRow {...shared} y={row1Y} fill="#cccccc" label="Trace" />
        <TraceRow {...shared} y={row2Y} fill="#e0e0e0" label="Trace again" />
        <TraceRow {...shared} y={row3Y} fill="transparent" showText={false} label="Your turn" />
      </svg>

      <p className="mt-2 text-right text-xs text-ink/25">SparkPlay</p>
    </div>
  );
}

// ─── Activity Sheet Template ─────────────────────────────────────────────────
function ActivitySheetTemplate({
  name, title, steps, materials,
}: {
  name: string; title: string; steps: string[]; materials: string[];
}) {
  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 print:px-0 print:py-4">
      <div className="mb-5 rounded-xl bg-coral-light px-5 py-4">
        {name && (
          <p className="text-xs font-bold uppercase tracking-widest text-coral-dark">
            {name}&apos;s Activity
          </p>
        )}
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      </div>

      {steps.length > 0 && (
        <div className="mt-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
            What we&apos;re doing today:
          </p>
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="mt-1 text-base leading-relaxed text-ink">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {materials.length > 0 && (
        <div className="mt-6 rounded-xl border border-ink/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">You&apos;ll need:</p>
          <p className="mt-1 text-sm text-ink">{materials.join(", ")}</p>
        </div>
      )}

      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">My drawing / work:</p>
        <div className="rounded-lg border-2 border-dashed border-ink/20" style={{ height: "280px" }} aria-label="Drawing space" />
      </div>

      <p className="mt-4 text-right text-xs text-ink/25">SparkPlay</p>
    </div>
  );
}

// ─── Drawing Frame Template ───────────────────────────────────────────────────
function DrawingFrameTemplate({ title, name }: { title: string; name?: string }) {
  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 print:px-0 print:py-4">
      <div className="mb-5 rounded-xl bg-coral-light px-5 py-4">
        {name && (
          <p className="text-xs font-bold uppercase tracking-widest text-coral-dark">
            {name}&apos;s Activity
          </p>
        )}
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      </div>
      <div className="rounded-lg border-2 border-ink/20" style={{ height: "460px" }} aria-label="Working space" />
      <p className="mb-2 mt-6 text-sm text-ink/50">What I made / what happened:</p>
      <div className="rounded border border-dashed border-ink/20" style={{ height: "68px" }} aria-label="Writing space" />
      <p className="mt-4 text-right text-xs text-ink/25">SparkPlay</p>
    </div>
  );
}

// ─── Root client component ────────────────────────────────────────────────────
export default function WorksheetClient({ type, initialName, title, steps = [], materials = [] }: Props) {
  const [names, setNames] = useState<string[]>([initialName]);

  function update(i: number, v: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? v : n)));
  }
  function add() {
    setNames((prev) => [...prev, ""]);
  }
  function remove(i: number) {
    setNames((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky bar — hidden on print */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/10 bg-white px-4 py-2 shadow-sm print:hidden">
        <span className="text-sm font-medium text-ink/40">SparkPlay Worksheet</span>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full bg-coral px-4 py-1.5 text-sm font-semibold text-white hover:bg-coral-dark"
        >
          🖨 Print
        </button>
      </div>

      {/* ── Name-trace + drawing-frame: multi-child names panel ────────── */}
      {(type === "name_trace" || type === "drawing_frame") && (
        <>
          {/* Names panel — screen only */}
          <div className="mx-auto max-w-[820px] px-4 print:hidden">
            <div className="mt-6 rounded-2xl border-2 border-dashed border-coral-light bg-coral-light/30 px-5 py-4">
              <p className="mb-3 text-sm font-semibold text-coral-dark">
                ✏️ Children&apos;s names — one sheet will print per child
              </p>

              <div className="space-y-2">
                {names.map((n, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-center text-xs font-semibold text-coral-dark/50">
                      {i + 1}.
                    </span>
                    <input
                      type="text"
                      value={n}
                      onChange={(e) => update(i, e.target.value)}
                      placeholder="Child's name"
                      autoFocus={i === 0}
                      className="flex-1 rounded-xl border-2 border-coral/40 bg-white px-4 py-2 text-xl font-bold text-ink focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
                    />
                    {names.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-coral-dark hover:bg-coral-light"
                        aria-label={`Remove ${n || "this child"}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={add}
                className="mt-3 flex items-center gap-1.5 rounded-full border border-coral-light px-4 py-1.5 text-sm font-medium text-coral-dark hover:bg-coral-light"
              >
                + Add another child
              </button>

              <p className="mt-3 text-xs text-coral-dark/50">
                Add as many names as you need, then click Print — each child gets their own page.
              </p>
            </div>
          </div>

          {/* One sheet per child — separated by page breaks on print */}
          {names.map((n, i) => (
            <div
              key={i}
              style={{ pageBreakAfter: i < names.length - 1 ? "always" : "auto" }}
            >
              {i > 0 && (
                <hr className="mx-auto my-6 max-w-[820px] border-dashed border-ink/10 print:hidden" />
              )}
              {type === "name_trace" && <NameTraceTemplate name={n} title={title} />}
              {type === "drawing_frame" && <DrawingFrameTemplate title={title} name={n || undefined} />}
            </div>
          ))}
        </>
      )}

      {/* ── Activity-sheet flow ──────────────────────────────────────────── */}
      {type === "activity_sheet" && (
        <ActivitySheetTemplate name={initialName} title={title} steps={steps} materials={materials} />
      )}
    </div>
  );
}
