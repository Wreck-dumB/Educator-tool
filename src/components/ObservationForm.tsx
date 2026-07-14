"use client";

import { useRef, useState, useEffect } from "react";
import { inputClass, primaryButtonClass } from "@/lib/ui";

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
  /** Which observation types to surface. Defaults to all 7. */
  enabledTypes?: ObservationTypeName[];
}

export type ObservationTypeName =
  | "anecdotal"
  | "learning_story"
  | "running_record"
  | "jotting"
  | "work_sample"
  | "photo_caption"
  | "developmental_note";

interface ObservationTypeConfig {
  label: string;
  short: string;
  description: string;
  notePlaceholder: string;
  titleLabel?: string;
  titlePlaceholder?: string;
  contextLabel?: string;
  contextPlaceholder?: string;
  photoRecommended?: boolean;
}

const OBSERVATION_TYPES: Record<ObservationTypeName, ObservationTypeConfig> = {
  anecdotal: {
    label: "Anecdotal record",
    short: "Anecdotal",
    description: "A brief, factual account of a specific event — what you saw, in the moment.",
    notePlaceholder:
      "Describe what you saw, heard, or noticed using specific, factual language.\nE.g. 'Sam picked up the red block, examined it carefully, then placed it on top of the blue one. He stepped back, smiled, and said \"tower!\"'",
  },
  learning_story: {
    label: "Learning story",
    short: "Learning story",
    description:
      "A narrative account of a child's learning journey, written personally and meaningfully. Standard format across Australian EYLF-aligned services.",
    notePlaceholder:
      "Write the story in first or third person. Capture what the child did, said, and what it reveals about their learning.\nE.g. 'Today I watched you become a builder…'",
    titleLabel: "Story title",
    titlePlaceholder: "E.g. 'The day Maya became a builder'",
    contextLabel: "What this tells me (educator reflection)",
    contextPlaceholder:
      "What learning do you see happening? Which EYLF outcomes or dispositions are visible?\nWhat might you plan or extend from this?",
  },
  running_record: {
    label: "Running record",
    short: "Running record",
    description:
      "A continuous, sequential observation documented as it happens over a set period — often used for language, behaviour, or social interaction tracking.",
    notePlaceholder:
      "Write what happens in sequence. Timestamp each entry.\nE.g. '9:12am — Mia moves to the water table and picks up a funnel.\n9:13am — She pours water slowly, watches it fall, then looks at Maya.\n9:14am — Says \"try\" and hands funnel to Maya.'",
    contextLabel: "Observation timeframe and setting",
    contextPlaceholder: "E.g. '9:10 – 9:25am, water play area, 3 children present'",
  },
  jotting: {
    label: "Jotting",
    short: "Jotting",
    description:
      "A quick in-the-moment note to expand later, or a brief capture of something worth recording.",
    notePlaceholder:
      "A word, phrase, or brief note. E.g. 'Liam — spontaneously counted to 12 using blocks' or 'Grace — noticed a caterpillar, called three friends over, led the conversation.'",
  },
  work_sample: {
    label: "Work sample",
    short: "Work sample",
    description:
      "Documentation of a child's artwork, construction, writing, or other output, with educator analysis of the process and product.",
    notePlaceholder:
      "Describe the child's process and product. What did they say or do while creating?\nE.g. 'Noah spent 20 minutes on this painting, repeatedly mixing colours and narrating his choices.'",
    titleLabel: "Work sample title / description",
    titlePlaceholder: "E.g. 'Self-portrait — paint on A3' or 'Block construction — tallest tower'",
    contextLabel: "Educator reflection",
    contextPlaceholder:
      "What does this piece show about the child's skills, thinking, creativity, and development?\nWhat would you plan next?",
    photoRecommended: true,
  },
  photo_caption: {
    label: "Photo with caption",
    short: "Photo caption",
    description:
      "A photo-led observation where the image carries the primary evidence — paired with a reflective caption.",
    notePlaceholder:
      "Write a reflective caption explaining what the photo shows and why it matters for this child's learning. Go beyond describing the image — explain the significance.",
    photoRecommended: true,
  },
  developmental_note: {
    label: "Developmental note",
    short: "Dev note",
    description:
      "An observation linked to a specific developmental milestone, skill area, or area of concern — often used for milestone tracking or developmental conversations with families.",
    notePlaceholder:
      "Note what you observed in this developmental area. Be specific about the skill demonstrated or the gap identified.",
    titleLabel: "Developmental area / milestone",
    titlePlaceholder:
      "E.g. 'Gross motor — jumping with two feet' or 'Language — two-word combinations'",
    contextLabel: "Context and planned next steps",
    contextPlaceholder:
      "What support, extension, or referral will you plan?\nDoes this observation need a parent conversation or documentation in the child's support plan?",
  },
};

const ALL_TYPES: ObservationTypeName[] = [
  "anecdotal",
  "learning_story",
  "running_record",
  "jotting",
  "work_sample",
  "photo_caption",
  "developmental_note",
];

export default function ObservationForm({
  action,
  children,
  outcomes,
  activityId,
  defaultEylfCodes = [],
  returnTo = "/observations",
  defaultChildId,
  enabledTypes,
}: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(defaultChildId ? [defaultChildId] : []),
  );
  const [obsType, setObsType] = useState<ObservationTypeName>("anecdotal");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [childSearch, setChildSearch] = useState("");

  const visibleTypes = enabledTypes ?? ALL_TYPES;
  const typeConfig = OBSERVATION_TYPES[obsType];

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  function toggleChild(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const selectedChildren = children.filter((c) => selectedIds.has(c.id));
  const filteredChildren = childSearch
    ? children.filter((c) =>
        c.first_name.toLowerCase().includes(childSearch.toLowerCase()),
      )
    : children;

  const selectionLabel =
    selectedIds.size === 0
      ? "Select children…"
      : selectedIds.size === children.length
      ? `All ${children.length} children`
      : selectedChildren.map((c) => c.first_name).join(", ");

  return (
    <form action={action} encType="multipart/form-data" className="space-y-4">
      {activityId && <input type="hidden" name="activity_id" value={activityId} />}
      <input type="hidden" name="return_to" value={returnTo} />

      {/* ── Observation type ───────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-sm font-medium text-ink/70">Observation format</p>
        <div className="flex flex-wrap gap-1.5">
          {visibleTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setObsType(type)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                obsType === type
                  ? "border-coral bg-coral text-white"
                  : "border-coral-light text-ink/60 hover:border-coral hover:text-ink"
              }`}
            >
              {OBSERVATION_TYPES[type].short}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ink/40">{typeConfig.description}</p>
        <input type="hidden" name="observation_type" value={obsType} />
      </div>

      {/* ── Children dropdown ─────────────────────────────────────────── */}
      <div ref={dropdownRef} className="relative">
        <p className="mb-1.5 text-sm font-medium text-ink/70">
          {selectedIds.size > 1
            ? `Children (${selectedIds.size} selected — group observation)`
            : "Child"}
        </p>

        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
            selectedIds.size > 0
              ? "border-coral text-ink"
              : "border-coral-light text-ink/40"
          } hover:border-coral focus:border-coral focus:outline-none`}
        >
          <span className="truncate">{selectionLabel}</span>
          <svg
            className={`h-4 w-4 shrink-0 text-ink/40 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown panel */}
        {dropdownOpen && (
          <div className="absolute z-30 mt-1 w-full rounded-xl border border-coral-light bg-white shadow-lg">
            {/* Search */}
            {children.length > 5 && (
              <div className="border-b border-coral-light p-2">
                <input
                  type="text"
                  placeholder="Search children…"
                  value={childSearch}
                  onChange={(e) => setChildSearch(e.target.value)}
                  className="w-full rounded-lg border border-coral-light px-2.5 py-1.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
                  autoFocus
                />
              </div>
            )}

            {/* List */}
            <div className="max-h-52 overflow-y-auto p-1">
              {children.length > 1 && !childSearch && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set(children.map((c) => c.id)))}
                  className="w-full rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-coral-dark hover:bg-coral-light/50"
                >
                  Select all ({children.length})
                </button>
              )}
              {filteredChildren.map((c) => {
                const checked = selectedIds.has(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-coral-light/30"
                  >
                    <input
                      type="checkbox"
                      name="child_id"
                      value={c.id}
                      checked={checked}
                      onChange={() => toggleChild(c.id)}
                      className="h-4 w-4 rounded border-coral-light accent-coral"
                    />
                    <span className={checked ? "font-semibold text-ink" : "text-ink/70"}>
                      {c.first_name}
                    </span>
                  </label>
                );
              })}
              {filteredChildren.length === 0 && (
                <p className="px-3 py-2 text-sm text-ink/40">No children match</p>
              )}
            </div>

            {/* Done */}
            <div className="border-t border-coral-light p-2">
              <button
                type="button"
                onClick={() => { setDropdownOpen(false); setChildSearch(""); }}
                className="w-full rounded-lg bg-coral px-3 py-1.5 text-sm font-semibold text-white hover:bg-coral-dark"
              >
                Done{selectedIds.size > 0 ? ` (${selectedIds.size} selected)` : ""}
              </button>
            </div>
          </div>
        )}

        {selectedIds.size === 0 && !dropdownOpen && (
          <p className="mt-1 text-xs text-coral-dark">Select at least one child</p>
        )}
      </div>

      {/* ── Optional title (learning story, work sample, dev note) ─────── */}
      {typeConfig.titleLabel && (
        <div>
          <label className="block text-sm font-medium text-ink/70">
            {typeConfig.titleLabel}
            <span className="ml-1 font-normal text-ink/40">(optional)</span>
          </label>
          <input
            type="text"
            name="observation_title"
            placeholder={typeConfig.titlePlaceholder ?? ""}
            className={inputClass}
          />
        </div>
      )}

      {/* ── Observation note ───────────────────────────────────────────── */}
      <div>
        <label htmlFor="obs_note_text" className="block text-sm font-medium text-ink/70">
          {obsType === "photo_caption" ? "Caption / reflection" : "Observation note"}
        </label>
        <textarea
          id="obs_note_text"
          name="note_text"
          required
          rows={obsType === "running_record" ? 6 : obsType === "learning_story" ? 5 : 4}
          placeholder={typeConfig.notePlaceholder}
          className={inputClass}
        />
      </div>

      {/* ── Context field (running record, learning story, work sample, dev note) */}
      {typeConfig.contextLabel && (
        <div>
          <label className="block text-sm font-medium text-ink/70">
            {typeConfig.contextLabel}
            <span className="ml-1 font-normal text-ink/40">(optional)</span>
          </label>
          <textarea
            name="observation_context"
            rows={obsType === "developmental_note" || obsType === "learning_story" ? 3 : 2}
            placeholder={typeConfig.contextPlaceholder ?? ""}
            className={inputClass}
          />
        </div>
      )}

      {/* ── Photo ─────────────────────────────────────────────────────── */}
      <div>
        <p className="block text-sm font-medium text-ink/70">
          Photo{" "}
          {typeConfig.photoRecommended ? (
            <span className="font-normal text-sage-dark">(recommended for this format)</span>
          ) : (
            <span className="font-normal text-ink/40">(optional)</span>
          )}
        </p>
        {preview ? (
          <div className="relative mt-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview"
              className="h-40 w-40 rounded-xl border border-coral-light object-cover"
            />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-coral-dark text-xs text-white"
              aria-label="Remove photo"
            >
              ×
            </button>
          </div>
        ) : (
          <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-coral-light px-4 py-3 text-sm text-ink/50 hover:border-coral hover:text-ink/70">
            <span className="text-xl" aria-hidden>
              📷
            </span>
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

      {/* ── EYLF outcomes ─────────────────────────────────────────────── */}
      {outcomes.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink/70">EYLF outcomes (optional)</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {outcomes.map((o) => (
              <label
                key={o.id}
                title={o.sub_outcome_text}
                className="flex items-center gap-1.5 text-sm text-ink/70"
              >
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

      <button
        type="submit"
        disabled={selectedIds.size === 0}
        className={`w-full ${primaryButtonClass} disabled:opacity-40`}
      >
        {selectedIds.size > 1
          ? `Log observation for ${selectedIds.size} children`
          : "Log observation"}
      </button>
    </form>
  );
}
