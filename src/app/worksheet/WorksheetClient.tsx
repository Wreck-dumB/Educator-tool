"use client";

import { useState, useMemo } from "react";

type TemplateType = "name_trace" | "drawing_frame" | "writing_lines" | "activity_sheet";

interface Props {
  type: TemplateType;
  initialName: string;
  title: string;
  materials?: string[];
}

// Andika Bold average char width ≈ 0.62× font size (wider than Arial Bold 0.58×)
function pickFontSize(nameLength: number, maxWidth: number): number {
  for (const size of [90, 76, 64, 52, 42, 34, 28]) {
    if (nameLength * 0.62 * size <= maxWidth) return size;
  }
  return 24;
}

// ─── ImageDisplay ─────────────────────────────────────────────────────────────
function ImageDisplay({
  imageUrl, imageStyle, compact = false,
}: {
  imageUrl: string; imageStyle?: "outline" | "colour"; compact?: boolean;
}) {
  const isOutline = imageStyle === "outline";
  const height = compact ? 160 : 440;
  return (
    <div className="flex flex-col items-center">
      {isOutline && (
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink/40">
          ✂ Cut along the dotted line
        </p>
      )}
      <div
        className={`flex items-center justify-center overflow-hidden rounded-lg ${isOutline ? "border-4 border-dashed border-ink/40" : "border-2 border-ink/20"}`}
        style={{ height: `${height}px`, width: "100%" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Activity image"
          style={{ maxHeight: `${height - 8}px`, maxWidth: "100%", objectFit: "contain" }}
        />
      </div>
    </div>
  );
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
          fontFamily="var(--font-andika), 'Andika', Arial, sans-serif" style={{ userSelect: "none" }}>
          {label}
        </text>
      )}
      <line x1="0" y1={topLine}  x2={svgWidth} y2={topLine}  stroke="#d8d8d8" strokeWidth="0.8" strokeDasharray="4 3" />
      <line x1="0" y1={midLine}  x2={svgWidth} y2={midLine}  stroke="#e2e2e2" strokeWidth="0.8" strokeDasharray="4 3" />
      <line x1="0" y1={baseline} x2={svgWidth} y2={baseline} stroke="#b0b0b0" strokeWidth="1" />
      <line x1="0" y1={descLine} x2={svgWidth} y2={descLine} stroke="#e8e8e8" strokeWidth="0.6" />
      {showText && (
        <text x="4" y={baseline} fontSize={fontSize} fontWeight="bold"
          fontFamily="var(--font-andika), 'Andika', Arial, sans-serif" fill={fill} style={{ userSelect: "none" }}>
          {name}
        </text>
      )}
    </>
  );
}

// ─── Name Tracing Template (pure display — no inputs inside) ─────────────────
function NameTraceTemplate({ name, title, imageUrl, imageStyle }: {
  name: string; title: string; imageUrl?: string; imageStyle?: "outline" | "colour";
}) {
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

      {imageUrl && (
        <div className="mt-4">
          <ImageDisplay imageUrl={imageUrl} imageStyle={imageStyle} compact />
        </div>
      )}

      <p className="mt-2 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Activity Sheet Template — child-facing, no instruction steps ─────────────
function ActivitySheetTemplate({
  name, title, materials, imageUrl, imageStyle,
}: {
  name: string; title: string; materials: string[];
  imageUrl?: string; imageStyle?: "outline" | "colour";
}) {
  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 print:px-0 print:py-4">
      <div className="mb-5 rounded-xl bg-coral-light px-5 py-5 text-center">
        {name && <p className="font-display text-4xl font-bold text-coral-dark">{name}</p>}
        <p className="mt-1 text-base font-semibold text-ink/70">{title}</p>
      </div>

      {materials.length > 0 && (
        <div className="mb-5 rounded-xl border border-ink/10 px-5 py-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/40">You will need:</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {materials.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-5 w-5 shrink-0 rounded border-2 border-ink/30" aria-hidden />
                <span className="text-sm text-ink">{m}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {imageUrl ? (
        <ImageDisplay imageUrl={imageUrl} imageStyle={imageStyle} />
      ) : (
        <div className="rounded-xl border-2 border-ink/20" style={{ height: "380px" }} aria-label="Working space" />
      )}

      <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-widest text-ink/40">What I made / what happened:</p>
      <div className="rounded border border-dashed border-ink/20" style={{ height: "60px" }} aria-label="Writing space" />
      <p className="mt-4 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Writing Lines Template ───────────────────────────────────────────────────
function WritingLinesTemplate({ name, title, imageUrl, imageStyle }: {
  name?: string; title: string; imageUrl?: string; imageStyle?: "outline" | "colour";
}) {
  const svgWidth = 760;
  const rows = 7;
  const capToBaseline = 50;
  const midToBaseline = 26;
  const descGap = 12;
  const rowSpacing = capToBaseline + descGap + 16;
  const startY = 16;
  const svgHeight = startY + rows * rowSpacing + 16;

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

      {imageUrl && (
        <div className="mb-4">
          <ImageDisplay imageUrl={imageUrl} imageStyle={imageStyle} compact />
        </div>
      )}

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        aria-label="Handwriting lines"
        style={{ display: "block" }}
      >
        {Array.from({ length: rows }, (_, i) => {
          const y = startY + i * rowSpacing;
          return (
            <g key={i}>
              {/* Cap line */}
              <line x1="0" y1={y} x2={svgWidth} y2={y} stroke="#e2e2e2" strokeWidth="0.7" strokeDasharray="4 3" />
              {/* Midline (x-height) */}
              <line x1="0" y1={y + (capToBaseline - midToBaseline)} x2={svgWidth} y2={y + (capToBaseline - midToBaseline)} stroke="#d8d8d8" strokeWidth="0.7" strokeDasharray="4 3" />
              {/* Baseline — solid, where letters sit */}
              <line x1="0" y1={y + capToBaseline} x2={svgWidth} y2={y + capToBaseline} stroke="#b0b0b0" strokeWidth="1.1" />
              {/* Descender line */}
              <line x1="0" y1={y + capToBaseline + descGap} x2={svgWidth} y2={y + capToBaseline + descGap} stroke="#efefef" strokeWidth="0.5" />
            </g>
          );
        })}
      </svg>

      <p className="mt-4 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Drawing Frame Template ───────────────────────────────────────────────────
function DrawingFrameTemplate({ title, name, imageUrl, imageStyle }: {
  title: string; name?: string; imageUrl?: string; imageStyle?: "outline" | "colour";
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
      {imageUrl ? (
        <ImageDisplay imageUrl={imageUrl} imageStyle={imageStyle} />
      ) : (
        <div className="rounded-lg border-2 border-ink/20" style={{ height: "460px" }} aria-label="Working space" />
      )}
      <p className="mb-2 mt-6 text-sm text-ink/50">What I made / what happened:</p>
      <div className="rounded border border-dashed border-ink/20" style={{ height: "68px" }} aria-label="Writing space" />
      <p className="mt-4 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Root client component ────────────────────────────────────────────────────
export default function WorksheetClient({ type, initialName, title, materials = [] }: Props) {
  const [names, setNames] = useState<string[]>([initialName]);

  // Image generation state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageStyle, setImageStyle] = useState<"outline" | "colour">("outline");
  const [imagePrompt, setImagePrompt] = useState(title);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  async function generateImage() {
    setImageLoading(true);
    setImageError(null);
    setImageUrl(null);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt, style: imageStyle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImageError(data.error ?? "Image generation failed");
        setImageLoading(false);
      } else {
        // imageUrl is a Pollinations URL — image loads in the <img> tag,
        // imageLoading stays true until onLoad fires
        setImageUrl(data.imageUrl);
      }
    } catch {
      setImageError("Could not reach the server");
      setImageLoading(false);
    }
  }

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
        <span className="text-sm font-medium text-ink/40">DR. SparkPlay Worksheet</span>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full bg-coral px-4 py-1.5 text-sm font-semibold text-white hover:bg-coral-dark"
        >
          🖨 Print
        </button>
      </div>

      {/* ── Name-trace + drawing-frame + writing-lines: multi-child names ─ */}
      {(type === "name_trace" || type === "drawing_frame" || type === "writing_lines") && (
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

          {/* Image generation panel — screen only */}
          <div className="mx-auto max-w-[820px] px-4 print:hidden">
            <div className="mt-4 rounded-2xl border-2 border-dashed border-sage-light bg-sage-light/20 px-5 py-4">
              <p className="mb-3 text-sm font-semibold text-sage-dark">🎨 Activity image (optional)</p>

              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setImageStyle("outline")}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${imageStyle === "outline" ? "border-sage bg-sage text-white" : "border-sage-light text-sage-dark hover:bg-sage-light"}`}
                >
                  ✂️ Cut-out outline
                </button>
                <button
                  type="button"
                  onClick={() => setImageStyle("colour")}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${imageStyle === "colour" ? "border-sage bg-sage text-white" : "border-sage-light text-sage-dark hover:bg-sage-light"}`}
                >
                  🎨 Colour image
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Describe what to generate…"
                  className="flex-1 rounded-xl border border-sage-light bg-white px-3 py-2 text-sm focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
                />
                <button
                  type="button"
                  onClick={generateImage}
                  disabled={imageLoading || !imagePrompt.trim()}
                  className="shrink-0 rounded-full bg-sage px-4 py-2 text-sm font-semibold text-white hover:bg-sage-dark disabled:opacity-50"
                >
                  {imageLoading ? (imageUrl ? "Loading…" : "Generating…") : "Generate"}
                </button>
              </div>

              {imageError && <p className="mt-2 text-sm text-coral-dark">{imageError}</p>}

              {imageLoading && !imageUrl && (
                <p className="mt-2 text-sm text-sage-dark/70">Generating image — this takes about 15–20 seconds…</p>
              )}

              {imageUrl && (
                <div className="mt-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Generated preview"
                    className="h-16 w-16 rounded border border-sage-light object-contain bg-white"
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImageError("Image failed to load — please try again.");
                      setImageUrl(null);
                      setImageLoading(false);
                    }}
                  />
                  {imageLoading ? (
                    <span className="text-sm text-sage-dark/70">Loading image…</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="text-xs text-ink/40 hover:text-ink"
                    >
                      Remove image
                    </button>
                  )}
                </div>
              )}

              <p className="mt-3 text-xs text-sage-dark/60">
                {imageStyle === "outline"
                  ? "Generates a black-and-white outline children can cut out or colour in."
                  : "Generates a colour illustration for the worksheet."}
              </p>
            </div>
          </div>

          {/* One sheet per child — separated by page breaks on print */}
          {names.map((n, i) => (
            <div
              key={i}
              style={{
                pageBreakAfter: i < names.length - 1 ? "always" : "auto",
                breakAfter: i < names.length - 1 ? "page" : "auto",
                overflow: "hidden",
              }}
            >
              {i > 0 && (
                <hr className="mx-auto my-6 max-w-[820px] border-dashed border-ink/10 print:hidden" />
              )}
              {type === "name_trace" && <NameTraceTemplate name={n} title={title} imageUrl={imageUrl ?? undefined} imageStyle={imageStyle} />}
              {type === "drawing_frame" && <DrawingFrameTemplate title={title} name={n || undefined} imageUrl={imageUrl ?? undefined} imageStyle={imageStyle} />}
              {type === "writing_lines" && <WritingLinesTemplate title={title} name={n || undefined} imageUrl={imageUrl ?? undefined} imageStyle={imageStyle} />}
            </div>
          ))}
        </>
      )}

      {/* ── Activity-sheet flow ──────────────────────────────────────────── */}
      {type === "activity_sheet" && (
        <ActivitySheetTemplate name={initialName} title={title} materials={materials} imageUrl={imageUrl ?? undefined} imageStyle={imageStyle} />
      )}
    </div>
  );
}
