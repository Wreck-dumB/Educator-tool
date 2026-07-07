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
        <label htmlFor="obs_child_id" className="block text-sm font-medium text-ink/70">
          Child
        </label>
        <select
          id="obs_child_id"
          name="child_id"
          required
          defaultValue={defaultChildId ?? ""}
          className={inputClass}
        >
          {children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.first_name}
            </option>
          ))}
        </select>
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

      <button type="submit" className={`w-full ${primaryButtonClass}`}>
        Log observation
      </button>
    </form>
  );
}
