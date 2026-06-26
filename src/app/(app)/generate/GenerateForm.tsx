"use client";

import { useState } from "react";
import Link from "next/link";
import type { EylfOutcome, Material, ChildProfile, ActivitySuggestion } from "@/lib/types/domain";
import type { GenerationMode } from "@/lib/types/database.types";
import { saveActivity } from "./save";
import { getMaterialIcon, getEnergyIcon, getGroupIcon, getEnergyBadgeClass } from "@/lib/icons";

const inputClass =
  "mt-1 block w-full rounded-xl border border-coral-light bg-white px-3 py-2 shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral";

function pillClass(active: boolean) {
  return `rounded-full border px-3 py-1 text-sm transition-colors ${
    active ? "border-coral bg-coral-light text-coral-dark" : "border-coral-light/60 text-ink/70 hover:bg-coral-light/40"
  }`;
}

interface Props {
  outcomes: EylfOutcome[];
  materials: Material[];
  childProfiles: ChildProfile[];
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function GenerateForm({ outcomes, materials, childProfiles }: Props) {
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [adhocMaterials, setAdhocMaterials] = useState("");
  const [timeMinutes, setTimeMinutes] = useState<number | "">("");
  const [groupSize, setGroupSize] = useState("");
  const [energyLevel, setEnergyLevel] = useState("");
  const [selectedOutcomes, setSelectedOutcomes] = useState<Set<string>>(new Set());
  const [childId, setChildId] = useState("");
  const [childQuery, setChildQuery] = useState("");
  const [focusInterest, setFocusInterest] = useState("");

  const selectedChild = childProfiles.find((c) => c.id === childId);
  const childMatches =
    !childId && childQuery.trim()
      ? childProfiles.filter((c) => c.first_name.toLowerCase().includes(childQuery.trim().toLowerCase()))
      : [];

  function selectChild(child: ChildProfile) {
    setChildId(child.id);
    setChildQuery("");
    setFocusInterest(child.current_interests ?? "");
  }

  function clearChild() {
    setChildId("");
    setChildQuery("");
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ActivitySuggestion[]>([]);
  const [mode, setMode] = useState<GenerationMode>("surprise_me");
  const [saveStates, setSaveStates] = useState<Record<number, SaveState>>({});
  const [savedIds, setSavedIds] = useState<Record<number, string>>({});

  function toggleMaterial(name: string) {
    setSelectedMaterials((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleOutcome(code: string) {
    setSelectedOutcomes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function generate(surpriseMe: boolean) {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setSaveStates({});
    setSavedIds({});

    const adhoc = adhocMaterials
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    const allMaterials = [...selectedMaterials, ...adhoc];
    const trimmedInterest = focusInterest.trim();

    let generationMode: GenerationMode = "surprise_me";
    if (allMaterials.length > 0) generationMode = "materials";
    else if (selectedOutcomes.size > 0) generationMode = "outcome";
    else if (trimmedInterest) generationMode = "interest";
    else if (timeMinutes) generationMode = "time";
    else if (surpriseMe) generationMode = "surprise_me";
    setMode(generationMode);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: generationMode,
          surpriseMe,
          materials: allMaterials,
          timeMinutes: timeMinutes || undefined,
          groupSize: groupSize || undefined,
          energyLevel: energyLevel || undefined,
          targetOutcomeCodes: [...selectedOutcomes],
          childInterest: trimmedInterest || undefined,
          childId: childId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setSuggestions(data.activities ?? []);
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(suggestion: ActivitySuggestion, index: number) {
    setSaveStates((prev) => ({ ...prev, [index]: "saving" }));
    const result = await saveActivity(suggestion, mode);
    if ("error" in result) {
      setSaveStates((prev) => ({ ...prev, [index]: "error" }));
    } else {
      setSaveStates((prev) => ({ ...prev, [index]: "saved" }));
      setSavedIds((prev) => ({ ...prev, [index]: result.id }));
    }
  }

  return (
    <div>
      <div className="rounded-2xl border border-coral-light bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-coral-dark">What do you have?</h2>

        {materials.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium text-ink/70">Saved materials</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {materials.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMaterial(m.name)}
                  className={pillClass(selectedMaterials.has(m.name))}
                >
                  {getMaterialIcon(m.name)} {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3">
          <label htmlFor="adhoc" className="block text-sm font-medium text-ink/70">
            Other materials (comma separated)
          </label>
          <input
            id="adhoc"
            type="text"
            value={adhocMaterials}
            onChange={(e) => setAdhocMaterials(e.target.value)}
            placeholder="cardboard boxes, fabric scraps"
            className={inputClass}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-ink/70">
              Time available (minutes)
            </label>
            <input
              id="time"
              type="number"
              min={1}
              max={240}
              value={timeMinutes}
              onChange={(e) => setTimeMinutes(e.target.value ? Number(e.target.value) : "")}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="group" className="block text-sm font-medium text-ink/70">
              Group size
            </label>
            <select
              id="group"
              value={groupSize}
              onChange={(e) => setGroupSize(e.target.value)}
              className={inputClass}
            >
              <option value="">Any</option>
              <option value="solo">Solo</option>
              <option value="small_group">Small group</option>
              <option value="whole_group">Whole group</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="energy" className="block text-sm font-medium text-ink/70">
              Energy level
            </label>
            <select
              id="energy"
              value={energyLevel}
              onChange={(e) => setEnergyLevel(e.target.value)}
              className={inputClass}
            >
              <option value="">Any</option>
              <option value="calm">Calm</option>
              <option value="moderate">Moderate</option>
              <option value="high">High energy</option>
            </select>
          </div>
          {childProfiles.length > 0 && (
            <div className="relative">
              <label htmlFor="child_search" className="block text-sm font-medium text-ink/70">
                Focus child
              </label>
              {selectedChild ? (
                <div className="mt-1 flex items-center justify-between rounded-xl border border-coral bg-coral-light px-3 py-2">
                  <span className="text-sm font-medium text-coral-dark">
                    🧒 {selectedChild.first_name}
                  </span>
                  <button
                    type="button"
                    onClick={clearChild}
                    className="text-xs font-medium text-coral-dark hover:underline"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <>
                  <input
                    id="child_search"
                    type="text"
                    value={childQuery}
                    onChange={(e) => setChildQuery(e.target.value)}
                    placeholder="Search by name…"
                    className={inputClass}
                    autoComplete="off"
                  />
                  {childMatches.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full rounded-xl border border-coral-light bg-white py-1 shadow-md">
                      {childMatches.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => selectChild(c)}
                            className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-coral-light/40"
                          >
                            🧒 {c.first_name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              <p className="mt-1 text-xs text-ink/50">
                Pulls their saved interest plus recent observations into the generation.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4">
          <label htmlFor="focus_interest" className="block text-sm font-medium text-ink/70">
            Focus interest (optional)
          </label>
          <input
            id="focus_interest"
            type="text"
            value={focusInterest}
            onChange={(e) => setFocusInterest(e.target.value)}
            placeholder="e.g. dinosaurs, space, trucks, dragons"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-ink/50">
            Selecting a focus child above fills this in from their saved interests — feel free to
            type your own topic instead, whether or not a child is selected.
          </p>
        </div>

        {outcomes.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-ink/70">Target EYLF outcomes (optional)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {outcomes.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggleOutcome(o.code)}
                  title={o.sub_outcome_text}
                  className={pillClass(selectedOutcomes.has(o.code))}
                >
                  {o.code}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => generate(false)}
            disabled={loading}
            className="rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-dark disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate"}
          </button>
          <button
            type="button"
            onClick={() => generate(true)}
            disabled={loading}
            className="rounded-full border-2 border-sage px-5 py-2.5 text-sm font-semibold text-sage-dark transition-colors hover:bg-sage-light disabled:opacity-50"
          >
            ✨ Surprise me
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-coral-light px-3 py-2 text-sm text-coral-dark">{error}</p>
      )}

      {suggestions.length > 0 && (
        <div className="mt-6 space-y-4">
          {suggestions.map((s, i) => (
            <div key={i} className="rounded-2xl border border-coral-light bg-white p-5 shadow-sm">
              <h3 className="font-display text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mt-1 text-sm text-ink/70">{s.summary}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {s.energyLevel && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${getEnergyBadgeClass(s.energyLevel)}`}
                  >
                    {getEnergyIcon(s.energyLevel)} {s.energyLevel} energy
                  </span>
                )}
                {s.groupSizeFit && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cream-dark px-2.5 py-1 text-xs font-medium text-ink/70">
                    {getGroupIcon(s.groupSizeFit)} {s.groupSizeFit.replace("_", " ")}
                  </span>
                )}
                {s.durationMinutes && <span className="text-xs text-ink/50">{s.durationMinutes} min</span>}
                {s.ageRange && <span className="text-xs text-ink/50">&middot; {s.ageRange}</span>}
              </div>

              {s.steps.length > 0 && (
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink/80">
                  {s.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              )}

              {s.materialsUsed.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink/70">
                  <span className="font-medium">Materials:</span>
                  {s.materialsUsed.map((m, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1">
                      <span aria-hidden>{getMaterialIcon(m)}</span>
                      {m}
                    </span>
                  ))}
                </div>
              )}

              {s.reflectionPrompts.length > 0 && (
                <div className="mt-3 rounded-xl bg-amber-light p-3">
                  <p className="text-sm font-medium text-amber-dark">Reflection prompts</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-dark/90">
                    {s.reflectionPrompts.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {s.eylfCodes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.eylfCodes.map((code) => (
                    <span
                      key={code}
                      className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark"
                    >
                      EYLF {code}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4">
                {saveStates[i] === "saved" ? (
                  <Link
                    href={`/activities/${savedIds[i]}`}
                    className="text-sm font-medium text-sage-dark hover:underline"
                  >
                    Saved &mdash; view & log an observation
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSave(s, i)}
                    disabled={saveStates[i] === "saving"}
                    className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/80 disabled:opacity-50"
                  >
                    {saveStates[i] === "saving" ? "Saving…" : "Save to library"}
                  </button>
                )}
                {saveStates[i] === "error" && (
                  <span className="ml-2 text-sm text-coral-dark">Could not save, try again.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
