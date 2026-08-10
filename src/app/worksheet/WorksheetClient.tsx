"use client";

import { useState, useMemo, useEffect } from "react";
import {
  SINGLE_LINE_FONT,
  SINGLE_LINE_FONT_CAP_TOP,
  SINGLE_LINE_FONT_BASELINE,
  SINGLE_LINE_FONT_SPACE_WIDTH,
} from "@/lib/utils/singleLineFont";

type TemplateType = "name_trace" | "name_colouring" | "letter_colouring" | "drawing_frame" | "writing_lines" | "activity_sheet" | "card_set" | "instructions" | "matching_pairs" | "counting_groups";

interface Props {
  type: TemplateType;
  initialNames: string[];
  cardItems?: string[];
  cardPairs?: boolean;
  imageSubject?: string;
  letterText?: string;
  title: string;
  summary?: string;
  materials?: string[];
  steps?: string[];
  eylfCodes?: string[];
  duration?: string;
  age?: string;
  group?: string;
  matchingLeft?: string[];
  matchingRight?: string[];
  countingGroups?: { emoji: string; label: string; count: number }[];
}

// Andika Bold average char width ≈ 0.62× font size (wider than Arial Bold 0.58×)
function pickFontSize(nameLength: number, maxWidth: number): number {
  for (const size of [90, 76, 64, 52, 42, 34, 28]) {
    if (nameLength * 0.62 * size <= maxWidth) return size;
  }
  return 24;
}

// Bigger steps than pickFontSize — the name is the whole page's focal point here
function pickColouringFontSize(nameLength: number, maxWidth: number): number {
  for (const size of [220, 190, 160, 130, 105, 84, 66, 52]) {
    if (nameLength * 0.62 * size <= maxWidth) return size;
  }
  return 40;
}

// Name recognition, not spelling — always Capitalised-then-lowercase regardless of input casing
function capitaliseName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Name";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

// ─── ImageDisplay ─────────────────────────────────────────────────────────────
// The free image service occasionally can't serve a picture (down, rate
// limited, blocked). Previously that failure was invisible — the <img> had no
// onError, so a broken request just left a permanent blank box with no
// feedback and no indication anything had gone wrong. Now it shows a clear
// message instead, and the rest of the sheet (name, etc.) still prints fine.
// Keyed by imageUrl at every call site so a new/regenerated image starts
// with fresh loaded/failed state (a remount) instead of a reset effect.
function ImageDisplay({
  imageUrl, imageStyle, compact = false,
}: {
  imageUrl: string; imageStyle?: "outline" | "colour"; compact?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const isOutline = imageStyle === "outline";
  const height = compact ? 160 : 440;

  if (failed) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-coral-light bg-coral-light/10 px-4 text-center print:hidden"
        style={{ height: `${height}px`, width: "100%" }}
      >
        <p className="text-sm font-medium text-coral-dark">Image couldn&apos;t be generated</p>
        <p className="text-xs text-ink/40">The free image service may be busy or unavailable right now — try again shortly.</p>
      </div>
    );
  }

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
        {!loaded && <span className="text-xs text-ink/30 print:hidden">Generating…</span>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Activity image"
          style={{ maxHeight: `${height - 8}px`, maxWidth: "100%", objectFit: "contain", display: loaded ? "block" : "none" }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      </div>
    </div>
  );
}

// ─── TraceRow ────────────────────────────────────────────────────────────────
// A normal/bold font's letters are filled shapes — tracing their *outline*
// always produces two parallel dashed edges per stroke, never one line. A
// true single-line dotted guide needs letterforms built from single-path
// line data instead, which SINGLE_LINE_FONT provides.
const SINGLE_LINE_GLYPH_HEIGHT = SINGLE_LINE_FONT_BASELINE - SINGLE_LINE_FONT_CAP_TOP;
const SINGLE_LINE_DEFAULT_ADVANCE = 8;

function SingleLineName({ name, x, baseline, capHeight, stroke }: {
  name: string; x: number; baseline: number; capHeight: number; stroke: string;
}) {
  const scale = capHeight / SINGLE_LINE_GLYPH_HEIGHT;
  let cursor = 0;
  const glyphs: { d: string; x: number }[] = [];
  for (const char of name) {
    if (char === " ") {
      cursor += SINGLE_LINE_FONT_SPACE_WIDTH;
      continue;
    }
    const glyph = SINGLE_LINE_FONT[char] ?? SINGLE_LINE_FONT[char.toUpperCase()] ?? SINGLE_LINE_FONT[char.toLowerCase()];
    if (!glyph) {
      cursor += SINGLE_LINE_DEFAULT_ADVANCE;
      continue;
    }
    glyphs.push({ d: glyph.d, x: cursor });
    cursor += glyph.width + 1;
  }

  return (
    <g transform={`translate(${x}, ${baseline - SINGLE_LINE_FONT_BASELINE * scale}) scale(${scale})`}>
      {glyphs.map((g, i) => (
        <path key={i} d={g.d} transform={`translate(${g.x}, 0)`}
          fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="1 3.4" vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
}

interface TraceRowProps {
  y: number;
  fill: string;
  label?: string;
  showText?: boolean;
  /** Render the name as a dashed/dotted outline to trace over, instead of solid fill. */
  dotted?: boolean;
  /** Render a true single-line dotted guide (SINGLE_LINE_FONT) instead of an outlined font. */
  singleLine?: boolean;
  name: string;
  fontSize: number;
  capHeight: number;
  xHeight: number;
  descender: number;
  svgWidth: number;
}

function TraceRow({
  y, fill, label, showText = true, dotted = false, singleLine = false,
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
      {showText && singleLine && (
        <SingleLineName name={name} x={4} baseline={baseline} capHeight={capHeight} stroke={fill} />
      )}
      {showText && !singleLine && (
        <text x="4" y={baseline} fontSize={fontSize} fontWeight={dotted ? "normal" : "bold"}
          fontFamily="var(--font-andika), 'Andika', Arial, sans-serif"
          fill={dotted ? "none" : fill}
          stroke={dotted ? fill : undefined}
          strokeWidth={dotted ? fontSize * 0.02 : undefined}
          strokeDasharray={dotted ? `${fontSize * 0.012} ${fontSize * 0.045}` : undefined}
          strokeLinecap={dotted ? "round" : undefined}
          style={{ userSelect: "none" }}>
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
        <TraceRow {...shared} y={row1Y} fill="#999999" dotted label="Trace" />
        <TraceRow {...shared} y={row2Y} fill="#999999" singleLine label="Trace again — single line" />
        <TraceRow {...shared} y={row3Y} fill="transparent" showText={false} label="Your turn" />
      </svg>

      {imageUrl && (
        <div className="mt-4">
          <ImageDisplay key={imageUrl} imageUrl={imageUrl} imageStyle={imageStyle} compact />
        </div>
      )}

      <p className="mt-2 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Name Colouring Template — big hollow letters to colour/glue, not trace ──
function NameColouringTemplate({
  name, title, imageUrl, imageStyle,
}: {
  name: string; title: string; imageUrl?: string; imageStyle?: "outline" | "colour";
}) {
  const displayName = capitaliseName(name);
  const svgWidth = 760;

  const fontSize = useMemo(
    () => pickColouringFontSize(displayName.length, svgWidth - 40),
    [displayName.length],
  );
  const svgHeight = fontSize * 1.4;

  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 print:px-0 print:py-4">
      <div className="mb-4 border-b border-ink/10 pb-3">
        <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
        {name.trim() && (
          <p className="mt-0.5 text-sm text-ink/50">For <strong>{name.trim()}</strong></p>
        )}
      </div>

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        aria-label={`Colour in the name ${displayName}`}
        style={{ display: "block" }}
      >
        <text
          x={svgWidth / 2}
          y={svgHeight * 0.75}
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight="bold"
          fontFamily="var(--font-andika), 'Andika', Arial, sans-serif"
          fill="#ffffff"
          stroke="#2b2b2b"
          strokeWidth={Math.max(2.5, fontSize * 0.05)}
          strokeLinejoin="round"
          style={{ userSelect: "none" }}
        >
          {displayName}
        </text>
      </svg>

      <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-widest text-ink/40">
        🖌 Colour in the letters, or glue your cut-out pieces on:
      </p>
      {imageUrl ? (
        <ImageDisplay key={imageUrl} imageUrl={imageUrl} imageStyle={imageStyle} />
      ) : (
        <div
          className="rounded-xl border-2 border-dashed border-ink/25"
          style={{ height: "380px" }}
          aria-label="Glue / decorating space"
        />
      )}

      <p className="mt-4 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Letter Colouring Template — a letter/number/word in big hollow text,
// rendered as real text (never an AI-drawn picture, which is unreliable at
// drawing accurate letterforms) ────────────────────────────────────────────
function LetterColouringTemplate({ text, name, title }: { text: string; name: string; title: string }) {
  const displayText = text.trim() || "?";
  const svgWidth = 760;

  const fontSize = useMemo(
    () => pickColouringFontSize(displayText.length, svgWidth - 40),
    [displayText.length],
  );
  const svgHeight = fontSize * 1.4;

  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 print:px-0 print:py-4">
      <div className="mb-4 border-b border-ink/10 pb-3">
        <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
        {name.trim() && (
          <p className="mt-0.5 text-sm text-ink/50">For <strong>{name.trim()}</strong></p>
        )}
      </div>

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        aria-label={`Colour in ${displayText}`}
        style={{ display: "block" }}
      >
        <text
          x={svgWidth / 2}
          y={svgHeight * 0.75}
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight="bold"
          fontFamily="var(--font-andika), 'Andika', Arial, sans-serif"
          fill="#ffffff"
          stroke="#2b2b2b"
          strokeWidth={Math.max(2.5, fontSize * 0.05)}
          strokeLinejoin="round"
          style={{ userSelect: "none" }}
        >
          {displayText}
        </text>
      </svg>

      <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-widest text-ink/40">
        🖌 Colour it in, or glue your cut-out pieces on:
      </p>
      <div
        className="rounded-xl border-2 border-dashed border-ink/25"
        style={{ height: "380px" }}
        aria-label="Glue / decorating space"
      />

      <p className="mt-4 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Card Set Template — printable cut-out cards (flashcards, memory/matching games) ──
interface CardFaceState {
  imageUrl: string | null;
  loading: boolean;
  error: boolean;
}

const CARDS_PER_PAGE = 8;
// Pollinations is free/keyless with no documented rate limit — firing many
// requests at once trips its abuse protection (ERR_BLOCKED_BY_ORB, seen
// empirically while building this). Spacing them out trades a bit of speed
// for actually loading.
const CARD_IMAGE_STAGGER_MS = 4000;

function CardSetTemplate({ items, title, pairs = true }: { items: string[]; title: string; pairs?: boolean }) {
  // One fetch per unique item — a matching pair reuses the same image so the
  // two cards actually look identical, not just share a text label.
  const [images, setImages] = useState<CardFaceState[]>(() =>
    items.map(() => ({ imageUrl: null, loading: true, error: false })),
  );

  function fetchCardImage(i: number, label: string) {
    setImages((prev) => prev.map((c, idx) => (idx === i ? { ...c, loading: true, error: false } : c)));
    fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: label, style: "colour" }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setImages((prev) => prev.map((c, idx) => (idx === i ? { ...c, loading: false, error: true } : c)));
        } else {
          setImages((prev) => prev.map((c, idx) => (idx === i ? { imageUrl: data.imageUrl, loading: true, error: false } : c)));
        }
      })
      .catch(() => {
        setImages((prev) => prev.map((c, idx) => (idx === i ? { ...c, loading: false, error: true } : c)));
      });
  }

  useEffect(() => {
    const timers = items.map((label, i) => setTimeout(() => fetchCardImage(i, label), i * CARD_IMAGE_STAGGER_MS));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Matching/memory games need pairs — each label prints twice, sharing one
  // image. Sorting/categorising activities want one unique card per label.
  const faces = useMemo(
    () => (pairs ? items.flatMap((label, i) => [{ label, i }, { label, i }]) : items.map((label, i) => ({ label, i }))),
    [items, pairs],
  );

  const pages: { label: string; i: number }[][] = [];
  for (let i = 0; i < faces.length; i += CARDS_PER_PAGE) pages.push(faces.slice(i, i + CARDS_PER_PAGE));

  return (
    <>
      {pages.map((pageFaces, pageIdx) => (
        <div
          key={pageIdx}
          className="mx-auto max-w-[820px] px-4 py-6 print:px-0 print:py-4"
          style={{
            pageBreakAfter: pageIdx < pages.length - 1 ? "always" : "auto",
            breakAfter: pageIdx < pages.length - 1 ? "page" : "auto",
          }}
        >
          {pageIdx === 0 && (
            <div className="mb-4 border-b border-ink/10 pb-3 print:hidden">
              <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
              <p className="mt-0.5 text-sm text-ink/50">
                {faces.length} cards{pairs ? ` (${items.length} pairs)` : ""} — cut along the dashed lines
              </p>
              <p className="mt-1 text-xs text-ink/40 print:hidden">
                Pictures load one at a time and can take a while for a full set — if one shows &quot;retry&quot;, just click it.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {pageFaces.map(({ label, i: itemIndex }, faceIdx) => {
              const image = images[itemIndex];
              return (
                <div
                  key={faceIdx}
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-dashed border-ink/30 p-3"
                  style={{ minHeight: "300px" }}
                >
                  <div
                    className="flex w-full flex-1 items-center justify-center overflow-hidden rounded-lg border border-ink/10 bg-white"
                    style={{ minHeight: "210px" }}
                  >
                    {image?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.imageUrl}
                        alt={label}
                        style={{ maxHeight: "220px", maxWidth: "100%", objectFit: "contain" }}
                        onLoad={() =>
                          setImages((prev) => prev.map((c, idx) => (idx === itemIndex ? { ...c, loading: false } : c)))
                        }
                        onError={() =>
                          setImages((prev) =>
                            prev.map((c, idx) => (idx === itemIndex ? { ...c, loading: false, error: true } : c)),
                          )
                        }
                      />
                    ) : image?.error ? (
                      <button
                        type="button"
                        onClick={() => fetchCardImage(itemIndex, label)}
                        className="text-xs font-medium text-coral-dark underline print:hidden"
                      >
                        Image failed — retry
                      </button>
                    ) : (
                      <span className="text-xs text-ink/30">Generating…</span>
                    )}
                  </div>
                  <p className="mt-2 text-center text-base font-bold text-ink">{label}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="mt-2 text-right text-xs text-ink/25 print:hidden">DR. SparkPlay</p>
    </>
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
        <ImageDisplay key={imageUrl} imageUrl={imageUrl} imageStyle={imageStyle} />
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
          <ImageDisplay key={imageUrl} imageUrl={imageUrl} imageStyle={imageStyle} compact />
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
        <ImageDisplay key={imageUrl} imageUrl={imageUrl} imageStyle={imageStyle} />
      ) : (
        <div className="rounded-lg border-2 border-ink/20" style={{ height: "460px" }} aria-label="Working space" />
      )}
      <p className="mb-2 mt-6 text-sm text-ink/50">What I made / what happened:</p>
      <div className="rounded border border-dashed border-ink/20" style={{ height: "68px" }} aria-label="Writing space" />
      <p className="mt-4 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Instructions Template ────────────────────────────────────────────────────
function InstructionsTemplate({
  title, summary, materials, steps, eylfCodes, duration, age, group,
}: {
  title: string; summary?: string; materials: string[]; steps: string[];
  eylfCodes: string[]; duration?: string; age?: string; group?: string;
}) {
  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 print:px-0 print:py-4">
      <div className="mb-5 rounded-xl bg-coral-light px-5 py-4">
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink/60">
          {duration && <span>⏱ {duration} min</span>}
          {age && <span>· {age}</span>}
          {group && <span>· {group.replace("_", " ")}</span>}
        </div>
      </div>

      {summary && (
        <p className="mb-5 text-sm text-ink/70">{summary}</p>
      )}

      {materials.length > 0 && (
        <div className="mb-5 rounded-xl border border-ink/10 px-5 py-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/40">You will need:</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {materials.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-4 w-4 shrink-0 rounded border border-ink/30" aria-hidden />
                <span className="text-sm text-ink">{m}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {steps.length > 0 && (
        <div className="mb-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/40">Steps:</p>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-coral-light text-xs font-bold text-coral-dark">
                  {i + 1}
                </span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {eylfCodes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {eylfCodes.map((code) => (
            <span key={code} className="rounded-full border border-sage-light px-2.5 py-0.5 text-xs font-medium text-sage-dark">
              EYLF {code}
            </span>
          ))}
        </div>
      )}

      <p className="mt-6 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Matching Pairs Template ──────────────────────────────────────────────────
function MatchingPairsTemplate({ title, matchingLeft, matchingRight }: {
  title: string; matchingLeft: string[]; matchingRight: string[];
}) {
  // Deterministic shuffle: rotate by half-length so display order differs from answer order
  const shuffledRight = useMemo(() => {
    if (matchingRight.length <= 1) return matchingRight;
    const mid = Math.ceil(matchingRight.length / 2);
    return [...matchingRight.slice(mid), ...matchingRight.slice(0, mid)];
  }, [matchingRight]);

  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 print:px-0 print:py-4">
      <div className="mb-5 rounded-xl bg-coral-light px-5 py-4">
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      </div>

      <p className="mb-8 text-center text-base font-semibold text-ink/60">
        ✏️ Draw a line to connect each matching pair.
      </p>

      <div className="flex flex-col gap-5">
        {matchingLeft.map((leftItem, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", height: "64px" }}>
            {/* Left cell: item box + stub line + dot */}
            <div style={{ flex: "2", display: "flex", alignItems: "center" }}>
              <span
                style={{
                  border: "2px solid #aaa",
                  borderRadius: "12px",
                  padding: "10px 16px",
                  fontSize: "18px",
                  fontWeight: "bold",
                  background: "white",
                  whiteSpace: "nowrap",
                  color: "#333",
                }}
              >
                {leftItem}
              </span>
              <div style={{ flex: 1, height: "2px", background: "#bbb", marginLeft: "10px" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#888", flexShrink: 0 }} />
            </div>

            {/* Blank centre — children draw lines here */}
            <div style={{ flex: "3" }} />

            {/* Right cell: dot + stub line + item box */}
            <div style={{ flex: "2", display: "flex", alignItems: "center" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#888", flexShrink: 0 }} />
              <div style={{ flex: 1, height: "2px", background: "#bbb", marginRight: "10px" }} />
              <span
                style={{
                  border: "2px solid #aaa",
                  borderRadius: "12px",
                  padding: "10px 16px",
                  fontSize: "18px",
                  fontWeight: "bold",
                  background: "white",
                  whiteSpace: "nowrap",
                  color: "#333",
                }}
              >
                {shuffledRight[i] ?? ""}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Counting Groups Template ─────────────────────────────────────────────────
function CountingGroupsTemplate({ title, countingGroups }: {
  title: string; countingGroups: { emoji: string; label: string; count: number }[];
}) {
  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 print:px-0 print:py-4">
      <div className="mb-5 rounded-xl bg-coral-light px-5 py-4">
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      </div>

      <p className="mb-8 text-center text-base font-semibold text-ink/60">
        ✏️ Count the objects in each box. Write the number.
      </p>

      <div className="flex flex-wrap justify-center gap-8">
        {countingGroups.map((group, i) => (
          <div
            key={i}
            style={{
              border: "2px solid #ccc",
              borderRadius: "16px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              width: "190px",
            }}
          >
            {/* Emoji grid */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "4px",
                justifyContent: "center",
                width: "150px",
                minHeight: "80px",
                alignContent: "flex-start",
              }}
            >
              {Array.from({ length: group.count }, (_, j) => (
                <span key={j} style={{ fontSize: "30px", lineHeight: "1.2" }}>
                  {group.emoji}
                </span>
              ))}
            </div>

            {/* Write-the-number blank */}
            <div
              style={{
                border: "3px solid #555",
                borderRadius: "10px",
                width: "72px",
                height: "60px",
                background: "#f9f9f9",
              }}
              aria-label="Write the number here"
            />

            {/* Label */}
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#555", textAlign: "center" }}>
              {group.label}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-10 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Root client component ────────────────────────────────────────────────────
export default function WorksheetClient({ type, initialNames, cardItems = [], cardPairs = true, imageSubject = "", letterText = "", title, summary, materials = [], steps = [], eylfCodes = [], duration, age, group, matchingLeft = [], matchingRight = [], countingGroups = [] }: Props) {
  const [names, setNames] = useState<string[]>(initialNames.length > 0 ? initialNames : [""]);

  // Image generation state — activity sheets default to a colour illustration
  // of the actual activity rather than a cut-out outline
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageStyle, setImageStyle] = useState<"outline" | "colour">(
    type === "activity_sheet" ? "colour" : "outline",
  );
  // The title (e.g. "Colour It In!") is an instruction, not a drawable
  // subject — default the manual prompt to the real subject when we have
  // one, and only fall back to the title as a last resort for manual use.
  const [imagePrompt, setImagePrompt] = useState(imageSubject || title);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  // Tracks only whether the small preview thumbnail's own <img> failed to
  // load — deliberately separate from imageUrl so a preview failure doesn't
  // wipe the shared URL out from under the full-size ImageDisplay elsewhere
  // on the sheet, which has its own independent load/error handling.
  const [previewFailed, setPreviewFailed] = useState(false);

  async function generateImage(promptOverride?: string, styleOverride?: "outline" | "colour") {
    const prompt = promptOverride ?? imagePrompt;
    const style = styleOverride ?? imageStyle;
    setImageLoading(true);
    setImageError(null);
    setImageUrl(null);
    setPreviewFailed(false);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style }),
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

  // Activity sheets and drawing frames should show the real activity, not a
  // blank workspace/box — generate the illustration automatically instead of
  // waiting for a manual click. Drawing frames get an outline (something to
  // colour/cut, matching their own default style) rather than a filled-in
  // colour picture, which would leave nothing for the child to actually do.
  //
  // Only fires when there's an actual concrete subject to draw. The activity
  // title is often an instruction ("Colour It In!", "Creative Craft Time"),
  // not a drawable object — generating from it produces an irrelevant,
  // nonsensical image, which is worse than a blank page. No subject means a
  // deliberately blank page, not a fallback to the title.
  //
  // Deferred a tick so the image fetch (and its setState calls) isn't triggered
  // synchronously from the effect body.
  useEffect(() => {
    const autoTypes: TemplateType[] = ["activity_sheet", "drawing_frame", "name_colouring"];
    if (!autoTypes.includes(type) || !imageSubject.trim()) return;
    const style = type === "activity_sheet" ? "colour" : "outline";
    const id = setTimeout(() => generateImage(imageSubject, style), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(i: number, v: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? v : n)));
  }
  // Typing/pasting "Mia, Jack, Priya" into one box explodes it into separate rows on blur
  function splitOnBlur(i: number) {
    setNames((prev) => {
      const v = prev[i];
      if (!v.includes(",")) return prev;
      const parts = v.split(",").map((p) => p.trim()).filter(Boolean);
      const next = [...prev];
      next.splice(i, 1, ...(parts.length > 0 ? parts : [""]));
      return next;
    });
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

      {/* ── Name-trace + name-colouring + drawing-frame + writing-lines + activity-sheet: multi-child names ─ */}
      {(type === "name_trace" || type === "name_colouring" || type === "letter_colouring" || type === "drawing_frame" || type === "writing_lines" || type === "activity_sheet") && (
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
                      onBlur={() => splitOnBlur(i)}
                      placeholder="Child's name, or paste a comma-separated list"
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
                Tip: type or paste several names separated by commas into one box and they&apos;ll split into rows automatically.
              </p>
            </div>
          </div>

          {/* Image generation panel — screen only. Not for letter colouring:
              the text itself, not a generated picture, is the page's content.
              Name colouring gets it too — an optional themed stencil under the name. */}
          {type !== "letter_colouring" && (
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
                  onClick={() => generateImage()}
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
                  {previewFailed ? (
                    <div className="flex h-16 w-16 items-center justify-center rounded border border-coral-light bg-coral-light/10 text-center text-[10px] text-coral-dark">
                      Unavailable
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt="Generated preview"
                      className="h-16 w-16 rounded border border-sage-light object-contain bg-white"
                      onLoad={() => setImageLoading(false)}
                      onError={() => {
                        // Deliberately not clearing imageUrl here — the
                        // full-size picture elsewhere on the sheet handles
                        // its own load/error state independently and should
                        // still get a chance to try (and show its own
                        // message if it also fails).
                        setImageError("Preview couldn't load — the picture on the sheet may still be generating.");
                        setPreviewFailed(true);
                        setImageLoading(false);
                      }}
                    />
                  )}
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
          )}

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
              {type === "name_colouring" && <NameColouringTemplate name={n} title={title} imageUrl={imageUrl ?? undefined} imageStyle={imageStyle} />}
              {type === "letter_colouring" && <LetterColouringTemplate text={letterText} name={n} title={title} />}
              {type === "drawing_frame" && <DrawingFrameTemplate title={title} name={n || undefined} imageUrl={imageUrl ?? undefined} imageStyle={imageStyle} />}
              {type === "writing_lines" && <WritingLinesTemplate title={title} name={n || undefined} imageUrl={imageUrl ?? undefined} imageStyle={imageStyle} />}
              {type === "activity_sheet" && <ActivitySheetTemplate name={n} title={title} materials={materials} imageUrl={imageUrl ?? undefined} imageStyle={imageStyle} />}
            </div>
          ))}
        </>
      )}

      {/* ── Card set: not per-child, a shared deck the whole group uses ──── */}
      {type === "card_set" && <CardSetTemplate items={cardItems} title={title} pairs={cardPairs} />}

      {/* ── Instructions flow (no image generation — print only) ─────────── */}
      {type === "instructions" && (
        <InstructionsTemplate
          title={title}
          summary={summary}
          materials={materials}
          steps={steps}
          eylfCodes={eylfCodes}
          duration={duration}
          age={age}
          group={group}
        />
      )}

      {/* ── Matching pairs: two-column draw-the-line worksheet ────────────── */}
      {type === "matching_pairs" && (
        <MatchingPairsTemplate title={title} matchingLeft={matchingLeft} matchingRight={matchingRight} />
      )}

      {/* ── Counting groups: count-and-write-the-number worksheet ─────────── */}
      {type === "counting_groups" && (
        <CountingGroupsTemplate title={title} countingGroups={countingGroups} />
      )}
    </div>
  );
}
