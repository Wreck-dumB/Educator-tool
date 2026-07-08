"use client";

import { useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { PosterCanvasHandle, SelectedInfo } from "./PosterCanvas";
import { BG_PRESETS } from "./PosterCanvas";
import ClipArtPanel from "./ClipArtPanel";
import { savePosterCanvas, uploadPosterImage } from "./actions";
import { errorBannerClass, successBannerClass } from "@/lib/ui";
import Link from "next/link";
import type { PosterCopySuggestion } from "@/lib/types/domain";

const PosterCanvas = dynamic(() => import("./PosterCanvas"), { ssr: false });

const FONT_SIZES = [14, 16, 18, 20, 24, 28, 32, 36, 42, 52, 64, 80];
const TEXT_COLORS = [
  "#e8430a", "#c0392b", "#2c3e50", "#ffffff", "#000000",
  "#2ecc71", "#27ae60", "#3498db", "#9b59b6", "#f39c12",
];

interface Props {
  initialJson?: object | null;
  posterId?: string;
}

export default function PosterMaker({ initialJson, posterId }: Props) {
  const canvasRef = useRef<PosterCanvasHandle>(null);
  const [posterName, setPosterName] = useState("My Poster");
  const [selected, setSelected] = useState<SelectedInfo | null>(null);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(posterId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAI, setShowAI] = useState(true);

  async function handleGenerateCopy() {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/poster-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: aiInput }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Generation failed"); return; }
      const copy: PosterCopySuggestion = data.copy;
      setPosterName(copy.title);
      canvasRef.current?.applyAICopy(
        copy.title,
        copy.subtitle ?? "",
        copy.bodyText ?? "",
        copy.footerText ?? ""
      );
    } catch {
      setError("Could not reach the server");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleUploadPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadPosterImage(formData);
      if ("error" in result) { setError(result.error); return; }
      canvasRef.current?.addClipArt(result.previewUrl);
    } finally {
      setUploading(false);
    }
  }

  const handleSave = useCallback(async () => {
    const json = canvasRef.current?.getJSON();
    if (!json) return;
    setSaving(true);
    setError(null);
    try {
      const result = await savePosterCanvas({ title: posterName.trim() || "Untitled", canvasJson: json, existingId: savedId ?? undefined });
      if ("error" in result) setError(result.error);
      else setSavedId(result.id);
    } finally {
      setSaving(false);
    }
  }, [posterName, savedId]);

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:gap-6">
      {/* ===== LEFT PANEL ===== */}
      <div className="flex flex-col gap-4 xl:w-72 xl:flex-shrink-0">

        {/* Poster name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-ink/40 mb-1">Poster name</label>
          <input
            value={posterName}
            onChange={(e) => setPosterName(e.target.value)}
            className="w-full rounded-xl border border-coral-light px-3 py-2 text-sm text-ink focus:border-coral focus:outline-none"
          />
        </div>

        {/* AI generator */}
        <div className="rounded-2xl border border-coral-light bg-white p-4">
          <button
            type="button"
            onClick={() => setShowAI(!showAI)}
            className="flex w-full items-center justify-between text-sm font-semibold text-ink"
          >
            <span>✨ Write it for me</span>
            <span className="text-ink/40 text-xs">{showAI ? "▲" : "▼"}</span>
          </button>
          {showAI && (
            <div className="mt-3">
              <textarea
                rows={3}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="e.g. Flier for Bush Dance, Friday 24 July 3pm — families bring a plate to share"
                className="w-full rounded-xl border border-coral-light px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none resize-none"
              />
              <button
                type="button"
                onClick={handleGenerateCopy}
                disabled={aiLoading || !aiInput.trim()}
                className="mt-2 w-full rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral-dark disabled:opacity-50 transition-colors"
              >
                {aiLoading ? "Writing…" : "Generate wording"}
              </button>
            </div>
          )}
        </div>

        {/* Add text */}
        <div className="rounded-2xl border border-coral-light bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 mb-2">Add text</p>
          <div className="flex flex-col gap-1.5">
            <button type="button" onClick={() => canvasRef.current?.addText("heading")}
              className="rounded-xl border border-coral-light px-3 py-2 text-left text-sm font-bold text-ink/70 hover:bg-coral-light/40 transition-colors">
              + Big Heading
            </button>
            <button type="button" onClick={() => canvasRef.current?.addText("subtitle")}
              className="rounded-xl border border-coral-light px-3 py-2 text-left text-sm font-semibold text-ink/70 hover:bg-coral-light/40 transition-colors">
              + Subtitle
            </button>
            <button type="button" onClick={() => canvasRef.current?.addText("body")}
              className="rounded-xl border border-coral-light px-3 py-2 text-left text-sm text-ink/70 hover:bg-coral-light/40 transition-colors">
              + Body text
            </button>
          </div>
        </div>

        {/* Text formatting (shown when text selected) */}
        {selected?.type === "text" && (
          <div className="rounded-2xl border border-sage-light bg-sage-light/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-dark mb-2">Text style</p>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => canvasRef.current?.boldSelected()}
                className={`flex-1 rounded-xl border py-1.5 text-sm font-bold transition-colors ${selected.bold ? "border-sage bg-sage text-white" : "border-sage-light text-ink/60 hover:bg-sage-light"}`}
              >B</button>
              <button
                type="button"
                onClick={() => canvasRef.current?.italicSelected()}
                className={`flex-1 rounded-xl border py-1.5 text-sm italic transition-colors ${selected.italic ? "border-sage bg-sage text-white" : "border-sage-light text-ink/60 hover:bg-sage-light"}`}
              >I</button>
            </div>
            <label className="block text-xs text-ink/50 mb-1">Size</label>
            <select
              value={selected.fontSize ?? 24}
              onChange={(e) => canvasRef.current?.setSelectedFontSize(Number(e.target.value))}
              className="w-full rounded-xl border border-sage-light bg-white px-2 py-1.5 text-sm focus:border-sage focus:outline-none mb-2"
            >
              {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
            </select>
            <label className="block text-xs text-ink/50 mb-1">Colour</label>
            <div className="flex flex-wrap gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => canvasRef.current?.setSelectedColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${selected.fill === c ? "border-coral scale-110" : "border-white/60"}`}
                  title={c}
                />
              ))}
            </div>
          </div>
        )}

        {/* Layer controls (shown when anything selected) */}
        {selected && (
          <div className="rounded-2xl border border-coral-light bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 mb-2">Arrange</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => canvasRef.current?.bringForward()}
                className="flex-1 rounded-xl border border-coral-light py-1.5 text-xs text-ink/60 hover:bg-coral-light/40 transition-colors">
                ↑ Forward
              </button>
              <button type="button" onClick={() => canvasRef.current?.sendBackward()}
                className="flex-1 rounded-xl border border-coral-light py-1.5 text-xs text-ink/60 hover:bg-coral-light/40 transition-colors">
                ↓ Backward
              </button>
              <button type="button" onClick={() => canvasRef.current?.deleteSelected()}
                className="rounded-xl border border-coral-light px-3 py-1.5 text-xs text-coral-dark hover:bg-coral-light/40 transition-colors">
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Background colour */}
        <div className="rounded-2xl border border-coral-light bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 mb-2">Background</p>
          <div className="flex flex-wrap gap-1.5">
            {BG_PRESETS.map((bg) => (
              <button
                key={bg.value}
                type="button"
                title={bg.label}
                onClick={() => canvasRef.current?.setBackground(bg.value)}
                style={{ backgroundColor: bg.value }}
                className="h-8 w-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
              />
            ))}
          </div>
        </div>

        {/* Clip art */}
        <div className="rounded-2xl border border-coral-light bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 mb-2">Clip art</p>
          <ClipArtPanel onSelect={(src) => canvasRef.current?.addClipArt(src)} />
        </div>

        {/* Photo upload */}
        <div className="rounded-2xl border border-coral-light bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 mb-2">Add your own photo</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleUploadPhoto(e.target.files?.[0])}
            className="block w-full text-xs text-ink/60 file:mr-3 file:rounded-full file:border-0 file:bg-coral-light file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-coral-dark hover:file:bg-coral-light/70"
          />
          {uploading && <p className="mt-1 text-xs text-ink/50">Uploading…</p>}
          <p className="mt-1 text-[11px] text-ink/40">Check photo/media consent before uploading photos of children.</p>
        </div>

        {/* Errors / success */}
        {error && <p className={errorBannerClass}>{error}</p>}
        {savedId && !error && (
          <p className={successBannerClass}>
            Saved!{" "}
            <Link href={`/posters/${savedId}`} className="font-semibold underline">
              Open edit / download →
            </Link>
          </p>
        )}

        {/* Save + download */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-full bg-coral px-4 py-2.5 text-sm font-semibold text-white hover:bg-coral-dark disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save poster"}
          </button>
          <button
            type="button"
            onClick={() => canvasRef.current?.downloadPNG()}
            className="rounded-full border border-sage px-4 py-2.5 text-sm font-semibold text-sage-dark hover:bg-sage-light transition-colors"
          >
            ↓ PNG
          </button>
        </div>

        <p className="text-[11px] text-ink/40 text-center">
          Download as a high-res PNG — print it or share it digitally.
        </p>
      </div>

      {/* ===== CANVAS ===== */}
      <div className="flex-1 overflow-x-auto">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/40">
          Canvas — click to select, drag to move, corner handles to resize
        </p>
        <PosterCanvas
          ref={canvasRef}
          initialJson={initialJson}
          onSelectionChange={setSelected}
        />
      </div>
    </div>
  );
}
