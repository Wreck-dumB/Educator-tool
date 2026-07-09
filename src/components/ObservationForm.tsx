"use client";

import { useRef, useState } from "react";
import { inputClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";

interface Child {
  id: string;
  first_name: string;
}

interface EylfOutcome {
  id: string;
  code: string;
  sub_outcome_text: string;
}

interface Props {
  action: (formData: FormData) => Promise<void>;
  children: Child[];
  outcomes: EylfOutcome[];
  activityId?: string;
  defaultEylfCodes?: string[];
  returnTo?: string;
  defaultChildId?: string;
}

export default function ObservationForm({
  action,
  children,
  outcomes,
  activityId,
  defaultEylfCodes = [],
  returnTo = "/observations",
  defaultChildId,
}: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(defaultChildId ? [defaultChildId] : []),
  );

  function toggleChild(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function clearPhoto() {
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form action={action} encType="multipart/form-data" className="space-y-4">
      {activityId && <input type="hidden" name="activity_id" value={activityId} />}
      <input type="hidden" name="return_to" value={returnTo} />

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-medium text-ink/70">
            Children{selectedIds.size > 1 ? ` (${selectedIds.size} selected — group observation)` : ""}
          </p>
          {children.length > 1 && selectedIds.size < children.length && (
            <button type="button" onClick={() => setSelectedIds(new Set(children.map((c) => c.id)))} className="text-xs text-coral-dark hover:underline">
              Select all
            </button>
          )}
          {selectedIds.size > 1 && (
            <button type="button" onClick={() => setSelectedIds(new Set(defaultChildId ? [defaultChildId] : []))} className="text-xs text-ink/40 hover:text-coral-dark">
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {children.map((c) => {
            const checked = selectedIds.has(c.id);
            return (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  checked
                    ? "border-coral bg-coral text-white"
                    : "border-coral-light bg-white text-ink/70 hover:border-coral hover:text-ink"
                }`}
              >
                <input
                  type="checkbox"
                  name="child_id"
                  value={c.id}
                  checked={checked}
                  onChange={() => toggleChild(c.id)}
                  className="sr-only"
                />
                {c.first_name}
              </label>
            );
          })}
        </div>
        {selectedIds.size === 0 && (
          <p className="mt-1 text-xs text-coral-dark">Select at least one child</p>
        )}
      </div>

      <div>
        <label htmlFor="obs_note_text" className="block text-sm font-medium text-ink/70">
          Observation note
        </label>
        <textarea
          id="obs_note_text"
          name="note_text"
          required
          rows={4}
          placeholder="Describe what you saw, heard, or noticed…"
          className={inputClass}
        />
      </div>

      {/* Photo capture */}
      <div>
        <p className="block text-sm font-medium text-ink/70">Photo (optional)</p>
        {preview ? (
          <div className="mt-2 relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview"
              className="h-40 w-40 rounded-xl object-cover border border-coral-light"
            />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-coral-dark text-white text-xs"
              aria-label="Remove photo"
            >
              ×
            </button>
          </div>
        ) : (
          <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-coral-light px-4 py-3 text-sm text-ink/50 hover:border-coral hover:text-ink/70">
            <span className="text-xl" aria-hidden>📷</span>
            <span>Tap to take a photo or choose from gallery</span>
            <input
              ref={fileRef}
              type="file"
              name="photo"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="sr-only"
            />
          </label>
        )}
      </div>

      {outcomes.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink/70">EYLF outcomes (optional)</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {outcomes.map((o) => (
              <label key={o.id} title={o.sub_outcome_text} className="flex items-center gap-1.5 text-sm text-ink/70">
                <input
                  type="checkbox"
                  name="eylf_codes"
                  value={o.code}
                  defaultChecked={defaultEylfCodes.includes(o.code)}
                />
                {o.code}
              </label>
            ))}
          </div>
        </div>
      )}

      <button type="submit" disabled={selectedIds.size === 0} className={`w-full ${primaryButtonClass} disabled:opacity-40`}>
        {selectedIds.size > 1 ? `Log observation for ${selectedIds.size} children` : "Log observation"}
      </button>
    </form>
  );
}
