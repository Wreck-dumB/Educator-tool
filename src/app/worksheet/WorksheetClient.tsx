"use client";

import { useState, useMemo, useEffect } from "react";
import {
  SINGLE_LINE_FONT,
  SINGLE_LINE_FONT_CAP_TOP,
  SINGLE_LINE_FONT_BASELINE,
  SINGLE_LINE_FONT_SPACE_WIDTH,
  type SingleLineGlyph,
} from "@/lib/utils/singleLineFont";
import { CLIPART_ITEMS } from "@/lib/clipart";
import { DOT_TO_DOT_SHAPES } from "@/lib/dotToDot";

type TemplateType = "name_trace" | "name_colouring" | "name_label" | "letter_colouring" | "drawing_frame" | "writing_lines" | "activity_sheet" | "card_set" | "instructions" | "matching_pairs" | "counting_groups" | "letter_trace" | "trace_maze" | "dot_to_dot" | "odd_one_out" | "feelings_checkin" | "cut_and_sort";

interface Props {
  type: TemplateType;
  initialNames: string[];
  cardItems?: string[];
  cardPairs?: boolean;
  imageSubject?: string;
  clipartId?: string;
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
  mazeStartEmoji?: string;
  mazeEndEmoji?: string;
  dotToDotShape?: string;
  oddOneOutSame?: string[];
  oddOneOutDifferent?: string;
  cutAndSortGroups?: { label: string; items: string[] }[];
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
        className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-coral-light bg-coral-light/10 px-4 text-center"
        style={{ height: `${height}px`, width: "100%" }}
      >
        <p className="text-sm font-medium text-coral-dark">Image couldn&apos;t be generated</p>
        <p className="text-xs text-ink/40 print:hidden">The free image service may be busy or unavailable right now — try again shortly.</p>
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
// Gap between glyphs, in font-native units, on top of each glyph's own ink extent.
const SINGLE_LINE_LETTER_GAP = 4;

// The font table's `width` field is unreliable (roughly half a glyph's real ink
// extent for many letters, e.g. "W" is 12 but its strokes reach x=22) — trusting
// it as the advance width makes consecutive letters overlap. Measure the actual
// rightmost x used by the glyph's path instead, so advance always clears the ink.
function glyphAdvance(glyph: SingleLineGlyph): number {
  const coords = glyph.d.match(/-?\d+(\.\d+)?/g);
  let maxX = glyph.width;
  if (coords) {
    for (let i = 0; i < coords.length; i += 2) {
      const x = Number(coords[i]);
      if (x > maxX) maxX = x;
    }
  }
  return maxX;
}

// A glyph's `d` often packs several disconnected strokes into one path (e.g. "H"
// is two verticals + a crossbar). A single fixed-unit dasharray spread over the
// whole thing lands dots wherever the cumulative length happens to fall, so each
// stroke's *own* endpoint — like the foot of a downstroke sitting on the baseline
// — only gets a dot by chance, otherwise it ends mid-gap and the letter looks like
// it's floating above the line it's mathematically sitting on. Splitting into one
// <path> per stroke lets each one get its own dash pattern instead.
function splitStrokes(d: string): string[] {
  return d.split(/(?=M)/).map((s) => s.trim()).filter(Boolean);
}

// Every glyph in this font is straight M/L segments (no curves), so a stroke's
// real length is just the sum of its point-to-point distances.
function strokeLength(d: string): number {
  const coords = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  let len = 0;
  for (let i = 2; i + 1 < coords.length; i += 2) {
    len += Math.hypot(coords[i] - coords[i - 2], coords[i + 1] - coords[i - 1]);
  }
  return len;
}

// Target dot size/spacing, in font-native units (matches the visual density of
// the font's previous flat "1 3.4" dasharray). A fixed dasharray on strokes of
// very different lengths (an "i" stem vs. an "N" diagonal) either vanishes on
// short strokes or looks nearly solid on long ones, so instead each stroke gets
// its own dasharray scaled so a whole number of repeats fits exactly — keeping
// dot size roughly constant while still landing a dot at both of its ends.
const DOT_UNIT = 1;
const GAP_UNIT = 3.4;
function strokeDasharray(d: string): string {
  const len = strokeLength(d);
  const repeat = DOT_UNIT + GAP_UNIT;
  const reps = Math.max(1, Math.round(len / repeat));
  const scaledRepeat = len / reps;
  const dot = scaledRepeat * (DOT_UNIT / repeat);
  return `${dot} ${scaledRepeat - dot}`;
}

function SingleLineName({ name, x, baseline, capHeight, stroke }: {
  name: string; x: number; baseline: number; capHeight: number; stroke: string;
}) {
  const scale = capHeight / SINGLE_LINE_GLYPH_HEIGHT;
  let cursor = 0;
  const glyphs: { strokes: string[]; x: number }[] = [];
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
    glyphs.push({ strokes: splitStrokes(glyph.d), x: cursor });
    cursor += glyphAdvance(glyph) + SINGLE_LINE_LETTER_GAP;
  }

  return (
    <g transform={`translate(${x}, ${baseline - SINGLE_LINE_FONT_BASELINE * scale}) scale(${scale})`}>
      {glyphs.map((g, i) => (
        <g key={i} transform={`translate(${g.x}, 0)`}>
          {g.strokes.map((strokeD, j) => (
            <path key={j} d={strokeD}
              fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={strokeDasharray(strokeD)} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
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

// ─── Name Label Template — solid bold text, ready to cut out (place markers,
// cubby/desk labels, name tags). No hollow outline, no dotted trace guide. ──
function NameLabelTemplate({ name, title, imageUrl, imageStyle }: {
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
        aria-label={`Name label for ${displayName}`}
        style={{ display: "block" }}
      >
        <text
          x={svgWidth / 2}
          y={svgHeight * 0.75}
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight="bold"
          fontFamily="var(--font-andika), 'Andika', Arial, sans-serif"
          fill="#2b2b2b"
          style={{ userSelect: "none" }}
        >
          {displayName}
        </text>
      </svg>

      {imageUrl && (
        <div className="mt-4">
          <ImageDisplay key={imageUrl} imageUrl={imageUrl} imageStyle={imageStyle} compact />
        </div>
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
  attempt: number;
}

const CARDS_PER_PAGE = 8;
// Even authenticated, Pollinations' Seed tier only allows ~1 request per 5s
// per app — firing many requests at once for a full card set still trips its
// abuse protection. Spacing them out trades a bit of speed for actually loading.
const CARD_IMAGE_STAGGER_MS = 4000;
// A rate-limit hit is usually transient — auto-retry with backoff before
// surfacing the manual "retry" button, so a busy moment doesn't need a click
// to recover from.
const MAX_AUTO_RETRIES = 2;
const AUTO_RETRY_DELAY_MS = 6000;

function CardSetTemplate({ items, title, pairs = true }: { items: string[]; title: string; pairs?: boolean }) {
  // One fetch per unique item — a matching pair reuses the same image so the
  // two cards actually look identical, not just share a text label.
  const [images, setImages] = useState<CardFaceState[]>(() =>
    items.map(() => ({ imageUrl: null, loading: true, error: false, attempt: 0 })),
  );

  // A rate-limit/service error is usually transient — auto-retry with backoff
  // before surfacing the manual "retry" button, so a busy moment doesn't need
  // a click to recover from. Shared by both failure paths below: the request
  // to our own API (which now does the real Pollinations fetch server-side,
  // so a Pollinations-side failure surfaces here) and the <img> tag itself
  // (kept as a defensive fallback, though a data URL practically never fails
  // to render once it's been handed to the browser).
  function retryOrGiveUp(i: number) {
    setImages((prev) => {
      const attempt = prev[i].attempt + 1;
      if (attempt <= MAX_AUTO_RETRIES) {
        setTimeout(() => fetchCardImage(i, items[i]), AUTO_RETRY_DELAY_MS * attempt);
        return prev.map((c, idx) => (idx === i ? { ...c, loading: true, error: false, attempt } : c));
      }
      return prev.map((c, idx) => (idx === i ? { ...c, loading: false, error: true } : c));
    });
  }

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
          retryOrGiveUp(i);
        } else {
          setImages((prev) => prev.map((c, idx) => (idx === i ? { ...c, imageUrl: data.imageUrl, loading: true, error: false } : c)));
        }
      })
      .catch(() => retryOrGiveUp(i));
  }

  function handleImageLoadError(i: number) {
    retryOrGiveUp(i);
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
                        onError={() => handleImageLoadError(itemIndex)}
                      />
                    ) : image?.error ? (
                      <div className="flex flex-col items-center gap-1 px-2 text-center">
                        <span className="hidden text-xs font-medium text-coral-dark print:inline">Image unavailable</span>
                        <button
                          type="button"
                          onClick={() => {
                            setImages((prev) => prev.map((c, idx) => (idx === itemIndex ? { ...c, attempt: 0 } : c)));
                            fetchCardImage(itemIndex, label);
                          }}
                          className="text-xs font-medium text-coral-dark underline print:hidden"
                        >
                          Image failed — retry
                        </button>
                      </div>
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

// ─── Letter Trace Template — reuses the same dotted single-line tracing
// system as NameTraceTemplate, but for a general letter/number/word rather
// than the child's own name (no per-child duplication needed). ─────────────
function LetterTraceTemplate({ text, title }: { text: string; title: string }) {
  const displayText = text.trim() || "Aa";
  const svgWidth = 760;

  const fontSize = useMemo(() => pickFontSize(displayText.length, svgWidth - 20) * 1.4, [displayText.length]);

  const capHeight  = fontSize * 0.72;
  const xHeight    = fontSize * 0.52;
  const descender  = fontSize * 0.22;
  const lineHeight = fontSize * 1.45;
  const rowSpacing = lineHeight + 24;

  const row1Y = 60;
  const row2Y = row1Y + rowSpacing;
  const row3Y = row2Y + rowSpacing;
  const row4Y = row3Y + rowSpacing;
  const svgHeight = row4Y + lineHeight + 40;

  const shared = { name: displayText, fontSize, capHeight, xHeight, descender, svgWidth };

  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 print:px-0 print:py-4">
      <div className="mb-4 border-b border-ink/10 pb-3">
        <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      </div>

      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%"
        aria-label={`Letter tracing worksheet for ${displayText}`} style={{ display: "block" }}>
        <TraceRow {...shared} y={row1Y} fill="#999999" dotted label="Trace" />
        <TraceRow {...shared} y={row2Y} fill="#999999" singleLine label="Trace again — single line" />
        <TraceRow {...shared} y={row3Y} fill="#999999" singleLine label="Keep going" />
        <TraceRow {...shared} y={row4Y} fill="transparent" showText={false} label="Your turn" />
      </svg>

      <p className="mt-2 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Trace Maze Template — a procedurally generated winding path (single
// corridor, no branching) from a start emoji to an end emoji. No AI image
// needed — a smooth wavy SVG path plus an offset pair of boundary curves,
// same class of fix as the clipart library was for outline images: generate
// the shape ourselves instead of gambling on a model drawing a clean maze. ──
function generateMazePath(seed: number, width: number, height: number): { d: string; wall1: string; wall2: string } {
  // Deterministic pseudo-random wave so the same activity always prints the
  // same maze (no seed persisted server-side, so re-opening the page is fine
  // to vary, but a single render is stable for its whole print run).
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  const segments = 7;
  const stepX = width / segments;
  const points: [number, number][] = [[0, height / 2]];
  for (let i = 1; i < segments; i++) {
    const y = height * 0.2 + rand() * height * 0.6;
    points.push([i * stepX, y]);
  }
  points.push([width, height / 2]);

  const toPath = (pts: [number, number][]) =>
    pts.reduce((acc, [x, y], i) => (i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`), "");

  const corridorWidth = height * 0.22;
  const wall1 = toPath(points.map(([x, y]) => [x, y - corridorWidth / 2] as [number, number]));
  const wall2 = toPath(points.map(([x, y]) => [x, y + corridorWidth / 2] as [number, number]));

  return { d: toPath(points), wall1, wall2 };
}

function TraceMazeTemplate({ title, startEmoji, endEmoji }: { title: string; startEmoji: string; endEmoji: string }) {
  const svgWidth = 760;
  const svgHeight = 420;
  const maze = useMemo(() => generateMazePath(42, svgWidth, svgHeight), []);

  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 print:px-0 print:py-4">
      <div className="mb-5 rounded-xl bg-coral-light px-5 py-4">
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      </div>

      <p className="mb-4 text-center text-base font-semibold text-ink/60">
        ✏️ Trace the path from start to finish.
      </p>

      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" aria-label="Trace-the-path maze" style={{ display: "block" }}>
        <path d={maze.wall1} fill="none" stroke="#b0b0b0" strokeWidth="2.5" />
        <path d={maze.wall2} fill="none" stroke="#b0b0b0" strokeWidth="2.5" />
        <path d={maze.d} fill="none" stroke="#d8d8d8" strokeWidth="1.5" strokeDasharray="3 6" />
        <text x="12" y={svgHeight / 2 + 14} fontSize="40" textAnchor="middle">{startEmoji}</text>
        <text x={svgWidth - 12} y={svgHeight / 2 + 14} fontSize="40" textAnchor="middle">{endEmoji}</text>
      </svg>

      <p className="mt-4 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Dot to Dot Template — renders one of the curated DOT_TO_DOT_SHAPES,
// numbered in connect-order. ─────────────────────────────────────────────
function DotToDotTemplate({ title, shapeId }: { title: string; shapeId: string }) {
  const shape = DOT_TO_DOT_SHAPES.find((s) => s.id === shapeId) ?? DOT_TO_DOT_SHAPES[0];
  const svgSize = 600;
  const pad = 60;
  const scale = (svgSize - pad * 2) / 100;
  const toXY = ([x, y]: [number, number]): [number, number] => [pad + x * scale, pad + y * scale];

  const closed = shape.closed !== false;
  const linePoints = closed ? [...shape.points, shape.points[0]] : shape.points;
  const pathD = linePoints
    .map(toXY)
    .reduce((acc, [x, y], i) => (i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`), "");

  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 print:px-0 print:py-4">
      <div className="mb-5 rounded-xl bg-coral-light px-5 py-4">
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      </div>

      <p className="mb-4 text-center text-base font-semibold text-ink/60">
        ✏️ Join the dots in order — what will it be?
      </p>

      <svg viewBox={`0 0 ${svgSize} ${svgSize}`} width="100%" style={{ display: "block" }}
        aria-label={`Dot to dot — ${shape.label}`}>
        <path d={pathD} fill="none" stroke="#e5e5e5" strokeWidth="1.5" strokeDasharray="2 5" />
        {shape.points.map(([x, y], i) => {
          const [px, py] = toXY([x, y]);
          return (
            <g key={i}>
              <circle cx={px} cy={py} r="4" fill="#555" />
              <text x={px + 8} y={py - 8} fontSize="15" fontWeight="bold" fill="#555">{i + 1}</text>
            </g>
          );
        })}
      </svg>

      <p className="mt-2 text-center text-sm text-ink/40">{shape.label}</p>
      <p className="mt-4 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Odd One Out Template — reuses the clipart library directly (flat
// colour SVGs, already reliable — see generate-image/route.ts's clipart
// path) rather than any AI-generated picture. ───────────────────────────
function OddOneOutTemplate({ title, sameIds, differentId }: { title: string; sameIds: string[]; differentId: string }) {
  const items = useMemo(() => {
    const same = sameIds.map((id) => CLIPART_ITEMS.find((i) => i.id === id)).filter((i): i is NonNullable<typeof i> => !!i);
    const different = CLIPART_ITEMS.find((i) => i.id === differentId);
    const all = different ? [...same, different] : same;
    // Deterministic shuffle so the odd one isn't always last
    const mid = Math.ceil(all.length / 2);
    return [...all.slice(mid), ...all.slice(0, mid)];
  }, [sameIds, differentId]);

  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 print:px-0 print:py-4">
      <div className="mb-5 rounded-xl bg-coral-light px-5 py-4">
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      </div>

      <p className="mb-8 text-center text-base font-semibold text-ink/60">
        ✏️ Circle the picture that&apos;s different from the rest.
      </p>

      <div className="flex flex-wrap justify-center gap-6">
        {items.map((item, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={item.src} alt={item.label} className="h-28 w-28 rounded-xl border-2 border-ink/15 bg-white p-2" />
        ))}
      </div>

      <p className="mt-10 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Feelings Check-in Template — fixed set of emotion faces (emoji-based,
// same reliability reasoning as CountingGroupsTemplate's emoji use — no
// generated art needed). Doesn't need any AI-supplied companion data. ─────
const FEELINGS = [
  { emoji: "😀", label: "Happy" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😠", label: "Angry" },
  { emoji: "😟", label: "Worried" },
  { emoji: "🤩", label: "Excited" },
  { emoji: "😌", label: "Calm" },
  { emoji: "😴", label: "Tired" },
  { emoji: "😕", label: "Confused" },
];

function FeelingsCheckinTemplate({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 print:px-0 print:py-4">
      <div className="mb-5 rounded-xl bg-coral-light px-5 py-4">
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      </div>

      <div className="mb-6 flex items-center gap-2">
        <span className="text-sm font-semibold text-ink/50">Name:</span>
        <div className="h-6 flex-1 border-b-2 border-dashed border-ink/20" />
      </div>

      <p className="mb-8 text-center text-base font-semibold text-ink/60">
        ✏️ Circle how you feel right now.
      </p>

      <div className="grid grid-cols-4 gap-6">
        {FEELINGS.map((f) => (
          <div key={f.label} className="flex flex-col items-center gap-2 rounded-2xl border-2 border-ink/15 p-4">
            <span style={{ fontSize: "48px" }}>{f.emoji}</span>
            <span className="text-sm font-semibold text-ink/60">{f.label}</span>
          </div>
        ))}
      </div>

      <p className="mt-10 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Cut and Sort Template — clipart pictures to cut out, plus labelled
// glue columns. Reuses the clipart library, same as OddOneOutTemplate. ─────
function CutAndSortTemplate({ title, groups }: { title: string; groups: { label: string; items: string[] }[] }) {
  return (
    <div className="mx-auto max-w-[820px] px-4 py-6 print:px-0 print:py-4">
      <div className="mb-5 rounded-xl bg-coral-light px-5 py-4">
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      </div>

      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/40">✂️ Cut out these pictures:</p>
      <div className="mb-8 flex flex-wrap justify-center gap-4 rounded-xl border-2 border-dashed border-ink/20 p-4">
        {groups.flatMap((g) => g.items).map((id, i) => {
          const item = CLIPART_ITEMS.find((c) => c.id === id);
          if (!item) return null;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={item.src} alt={item.label} className="h-16 w-16 rounded-lg border border-ink/15 bg-white p-1" />
          );
        })}
      </div>

      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/40">🖌 Glue them here:</p>
      <div className={`grid gap-4 ${groups.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {groups.map((g, i) => (
          <div key={i} className="rounded-xl border-2 border-ink/20 p-3" style={{ minHeight: "220px" }}>
            <p className="mb-2 text-center text-sm font-bold text-ink">{g.label}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-right text-xs text-ink/25">DR. SparkPlay</p>
    </div>
  );
}

// ─── Root client component ────────────────────────────────────────────────────
export default function WorksheetClient({ type, initialNames, cardItems = [], cardPairs = true, imageSubject = "", clipartId = "", letterText = "", title, summary, materials = [], steps = [], eylfCodes = [], duration, age, group, matchingLeft = [], matchingRight = [], countingGroups = [], mazeStartEmoji = "", mazeEndEmoji = "", dotToDotShape = "", oddOneOutSame = [], oddOneOutDifferent = "", cutAndSortGroups = [] }: Props) {
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

  // clipartIdForPrompt is only ever passed on the initial auto-generate call
  // below, alongside the AI's own original imageSubject text - a manual
  // "Generate" click (whether re-running the same text or an edited one)
  // deliberately omits it, since a curated icon id only really corresponds to
  // that original text; treating it as a request the user wants an AI
  // picture for that specific wording, matching or not.
  async function generateImage(promptOverride?: string, styleOverride?: "outline" | "colour", clipartIdForPrompt?: string) {
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
        body: JSON.stringify({ prompt, style, clipartId: clipartIdForPrompt }),
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
    const id = setTimeout(() => generateImage(imageSubject, style, clipartId), 0);
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

  // For these three, the child's name IS the page's content — printing with
  // none entered silently produces the literal placeholder word "Name",
  // styled identically to a real one, which reads as meaningless generic
  // lines rather than an obviously-incomplete page. Block Print rather than
  // let that happen quietly. Every other type treats a name as optional
  // decoration on an otherwise-complete page, so they're unaffected.
  const requiresName = type === "name_trace" || type === "name_colouring" || type === "name_label";
  const hasAnyName = names.some((n) => n.trim());
  const printBlocked = requiresName && !hasAnyName;

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky bar — hidden on print */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/10 bg-white px-4 py-2 shadow-sm print:hidden">
        <span className="text-sm font-medium text-ink/40">DR. SparkPlay Worksheet</span>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={printBlocked}
          title={printBlocked ? "Add at least one child's name below before printing — this worksheet needs it." : undefined}
          className="rounded-full bg-coral px-4 py-1.5 text-sm font-semibold text-white hover:bg-coral-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-coral"
        >
          🖨 Print
        </button>
      </div>

      {/* ── Name-trace + name-colouring + drawing-frame + writing-lines + activity-sheet: multi-child names ─ */}
      {(type === "name_trace" || type === "name_colouring" || type === "name_label" || type === "letter_colouring" || type === "drawing_frame" || type === "writing_lines" || type === "activity_sheet") && (
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

              {printBlocked && (
                <p className="mt-3 rounded-lg bg-coral-dark/10 px-3 py-2 text-sm font-medium text-coral-dark">
                  ⚠️ Add at least one child&apos;s name above — this worksheet is the child&apos;s name, so Print is disabled until one is entered.
                </p>
              )}
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
              {type === "name_label" && <NameLabelTemplate name={n} title={title} imageUrl={imageUrl ?? undefined} imageStyle={imageStyle} />}
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

      {/* ── Letter trace: dotted practice sheet for one letter/number/word ── */}
      {type === "letter_trace" && <LetterTraceTemplate text={letterText} title={title} />}

      {/* ── Trace maze: procedurally generated winding path ────────────────── */}
      {type === "trace_maze" && (
        <TraceMazeTemplate title={title} startEmoji={mazeStartEmoji || "🐭"} endEmoji={mazeEndEmoji || "🧀"} />
      )}

      {/* ── Dot to dot: curated shape, numbered connect-the-dots ────────────── */}
      {type === "dot_to_dot" && <DotToDotTemplate title={title} shapeId={dotToDotShape || DOT_TO_DOT_SHAPES[0].id} />}

      {/* ── Odd one out: circle the different picture ───────────────────────── */}
      {type === "odd_one_out" && (
        <OddOneOutTemplate title={title} sameIds={oddOneOutSame} differentId={oddOneOutDifferent} />
      )}

      {/* ── Feelings check-in: circle how you feel ──────────────────────────── */}
      {type === "feelings_checkin" && <FeelingsCheckinTemplate title={title} />}

      {/* ── Cut and sort: cut-out pictures + labelled glue columns ──────────── */}
      {type === "cut_and_sort" && <CutAndSortTemplate title={title} groups={cutAndSortGroups} />}
    </div>
  );
}
