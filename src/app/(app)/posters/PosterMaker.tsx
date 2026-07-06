"use client";

import { useState } from "react";
import Link from "next/link";
import type { PosterTheme } from "@/lib/types/database.types";
import type { PosterCopySuggestion } from "@/lib/types/domain";
import type { StockImage } from "@/lib/imageSearch";
import { inputClass, primaryButtonClass, secondaryButtonClass, errorBannerClass, successBannerClass } from "@/lib/ui";
import PosterView, { POSTER_THEMES } from "./PosterView";
import { savePoster, uploadPosterImage } from "./actions";

type ImageTab = "none" | "upload" | "search";

interface ChosenImage {
  source: "upload" | "stock";
  /** Storage path for uploads, hotlink URL for stock. */
  ref: string;
  previewUrl: string;
  credit: string | null;
}

export default function PosterMaker() {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [theme, setTheme] = useState<PosterTheme>("coral");
  const [image, setImage] = useState<ChosenImage | null>(null);

  const [imageTab, setImageTab] = useState<ImageTab>("none");
  const [imageQuery, setImageQuery] = useState("");
  const [imageResults, setImageResults] = useState<StockImage[]>([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateCopy() {
    if (!aiInput.trim()) {
      setError("Describe the poster first — e.g. reminder for families to bring hats, summer term.");
      return;
    }
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/poster-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: aiInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      const copy: PosterCopySuggestion = data.copy;
      setTitle(copy.title);
      setSubtitle(copy.subtitle ?? "");
      setBodyText(copy.bodyText ?? "");
      setFooterText(copy.footerText ?? "");
      if (copy.imageSearchSuggestion && !image) {
        setImageTab("search");
        setImageQuery(copy.imageSearchSuggestion);
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleImageSearch() {
    if (!imageQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/image-search?q=${encodeURIComponent(imageQuery)}`);
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Image search failed");
      else setImageResults(data.images);
    } catch {
      setError("Could not reach the server");
    } finally {
      setSearching(false);
    }
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadPosterImage(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setImage({ source: "upload", ref: result.path, previewUrl: result.previewUrl, credit: null });
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = await savePoster({
        title,
        subtitle: subtitle.trim() || null,
        bodyText: bodyText.trim() || null,
        footerText: footerText.trim() || null,
        theme,
        imageSource: image?.source ?? null,
        imagePath: image?.source === "upload" ? image.ref : null,
        imageUrl: image?.source === "stock" ? image.ref : null,
        imageCredit: image?.credit ?? null,
      });
      if ("error" in result) setError(result.error);
      else setSavedId(result.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* ============ Builder ============ */}
      <div className="rounded-2xl border border-coral-light bg-white p-5 shadow-sm">
        {/* AI assist */}
        <div className="rounded-xl bg-cream-dark/50 p-3">
          <label className="block text-sm font-medium text-ink/70">✨ Write it for me (optional)</label>
          <textarea
            rows={2}
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            placeholder="e.g. Flier for our Bush Dance, Friday 24 July 3pm, families bring a plate to share"
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleGenerateCopy}
            disabled={aiLoading}
            className={`mt-2 ${secondaryButtonClass}`}
          >
            {aiLoading ? "Writing…" : "Generate wording"}
          </button>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-ink/70">Headline</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bush Dance Friday!" className={inputClass} />
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-ink/70">Subtitle (optional)</label>
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. Friday 24 July · 3pm on the back lawn" className={inputClass} />
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-ink/70">Main text (optional)</label>
          <textarea rows={3} value={bodyText} onChange={(e) => setBodyText(e.target.value)} placeholder="A few short lines — posters are read from across the room." className={inputClass} />
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-ink/70">Footer line (optional)</label>
          <input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="e.g. RSVP at the front desk 💛" className={inputClass} />
        </div>

        {/* Theme */}
        <div className="mt-4">
          <p className="text-sm font-medium text-ink/70">Theme</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(Object.keys(POSTER_THEMES) as PosterTheme[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  theme === t ? "bg-coral text-white" : "border border-coral-light/60 text-ink/60 hover:bg-coral-light/40"
                }`}
              >
                {POSTER_THEMES[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* Image */}
        <div className="mt-4">
          <p className="text-sm font-medium text-ink/70">Picture</p>
          <div className="mt-1 flex gap-1.5">
            {(
              [
                ["none", "No picture"],
                ["upload", "My own photo"],
                ["search", "Find a free picture"],
              ] as [ImageTab, string][]
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setImageTab(tab);
                  if (tab === "none") setImage(null);
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  imageTab === tab ? "bg-sage text-white" : "border border-sage-light text-sage-dark hover:bg-sage-light"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {imageTab === "upload" && (
            <div className="mt-2">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleUpload(e.target.files?.[0])}
                className="block w-full text-sm text-ink/60 file:mr-3 file:rounded-full file:border-0 file:bg-coral-light file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-coral-dark hover:file:bg-coral-light/70"
              />
              {uploading && <p className="mt-1 text-xs text-ink/50">Uploading…</p>}
              <p className="mt-1 text-xs text-ink/40">
                JPEG/PNG/WebP up to 5 MB. If children appear in the photo, check their photo/media consent first.
              </p>
            </div>
          )}

          {imageTab === "search" && (
            <div className="mt-2">
              <div className="flex gap-2">
                <input
                  value={imageQuery}
                  onChange={(e) => setImageQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleImageSearch()}
                  placeholder="e.g. children gardening"
                  className={`${inputClass} mt-0`}
                />
                <button type="button" onClick={handleImageSearch} disabled={searching} className={secondaryButtonClass}>
                  {searching ? "…" : "Search"}
                </button>
              </div>
              <p className="mt-1 text-xs text-ink/40">
                Results are copyright-safe stock photos, free to use on your posters.
              </p>
              {imageResults.length > 0 && (
                <div className="mt-2 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
                  {imageResults.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() =>
                        setImage({
                          source: "stock",
                          ref: img.fullUrl,
                          previewUrl: img.thumbUrl,
                          credit: img.requiresAttribution ? img.credit : null,
                        })
                      }
                      className={`overflow-hidden rounded-lg border-2 transition-colors ${
                        image?.ref === img.fullUrl ? "border-sage" : "border-transparent hover:border-coral-light"
                      }`}
                      title={img.credit}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.thumbUrl} alt={img.credit} className="h-20 w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className={errorBannerClass}>{error}</p>}
        {savedId && (
          <p className={successBannerClass}>
            Poster saved!{" "}
            <Link href={`/posters/${savedId}`} className="font-semibold underline">
              Open the print view →
            </Link>
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className={`mt-4 ${primaryButtonClass}`}
        >
          {saving ? "Saving…" : "Save poster"}
        </button>
      </div>

      {/* ============ Live preview ============ */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/40">Preview</p>
        <PosterView
          poster={{
            title,
            subtitle: subtitle.trim() || null,
            bodyText: bodyText.trim() || null,
            footerText: footerText.trim() || null,
            theme,
            imageUrl: image?.previewUrl ?? null,
            imageCredit: image?.credit ?? null,
          }}
        />
      </div>
    </div>
  );
}
