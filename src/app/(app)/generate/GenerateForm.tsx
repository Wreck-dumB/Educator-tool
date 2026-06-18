"use client";

import { useState } from "react";
import Link from "next/link";
import type { EylfOutcome, Material, ChildProfile, ActivitySuggestion } from "@/lib/types/domain";
import type { GenerationMode } from "@/lib/types/database.types";
import { saveActivity } from "./save";

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
    const child = childProfiles.find((c) => c.id === childId);

    let generationMode: GenerationMode = "surprise_me";
    if (!surpriseMe) {
      if (allMaterials.length > 0) generationMode = "materials";
      else if (selectedOutcomes.size > 0) generationMode = "outcome";
      else if (child?.current_interests) generationMode = "interest";
      else if (timeMinutes) generationMode = "time";
    }
    setMode(generationMode);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: generationMode,
          materials: surpriseMe ? undefined : allMaterials,
          timeMinutes: surpriseMe ? undefined : timeMinutes || undefined,
          groupSize: surpriseMe ? undefined : groupSize || undefined,
          energyLevel: surpriseMe ? undefined : energyLevel || undefined,
          targetOutcomeCodes: surpriseMe ? undefined : [...selectedOutcomes],
          childInterest: surpriseMe ? undefined : child?.current_interests ?? undefined,
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
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">What do you have?</h2>

        {materials.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-700">Saved materials</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {materials.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMaterial(m.name)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    selectedMaterials.has(m.name)
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-300 text-gray-700"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3">
          <label htmlFor="adhoc" className="block text-sm font-medium text-gray-700">
            Other materials (comma separated)
          </label>
          <input
            id="adhoc"
            type="text"
            value={adhocMaterials}
            onChange={(e) => setAdhocMaterials(e.target.value)}
            placeholder="cardboard boxes, fabric scraps"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700">
              Time available (minutes)
            </label>
            <input
              id="time"
              type="number"
              min={1}
              max={240}
              value={timeMinutes}
              onChange={(e) => setTimeMinutes(e.target.value ? Number(e.target.value) : "")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="group" className="block text-sm font-medium text-gray-700">
              Group size
            </label>
            <select
              id="group"
              value={groupSize}
              onChange={(e) => setGroupSize(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <label htmlFor="energy" className="block text-sm font-medium text-gray-700">
              Energy level
            </label>
            <select
              id="energy"
              value={energyLevel}
              onChange={(e) => setEnergyLevel(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Any</option>
              <option value="calm">Calm</option>
              <option value="moderate">Moderate</option>
              <option value="high">High energy</option>
            </select>
          </div>
          {childProfiles.length > 0 && (
            <div>
              <label htmlFor="child" className="block text-sm font-medium text-gray-700">
                Tailor to a child
              </label>
              <select
                id="child"
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">None</option>
                {childProfiles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {outcomes.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700">Target EYLF outcomes (optional)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {outcomes.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggleOutcome(o.code)}
                  title={o.sub_outcome_text}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    selectedOutcomes.has(o.code)
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-300 text-gray-700"
                  }`}
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
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate"}
          </button>
          <button
            type="button"
            onClick={() => generate(true)}
            disabled={loading}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          >
            Surprise me
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {suggestions.length > 0 && (
        <div className="mt-6 space-y-4">
          {suggestions.map((s, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-gray-900">{s.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{s.summary}</p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                {s.durationMinutes && <span>{s.durationMinutes} min</span>}
                {s.energyLevel && <span>&middot; {s.energyLevel} energy</span>}
                {s.groupSizeFit && <span>&middot; {s.groupSizeFit.replace("_", " ")}</span>}
                {s.ageRange && <span>&middot; {s.ageRange}</span>}
              </div>

              {s.steps.length > 0 && (
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-gray-700">
                  {s.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              )}

              {s.materialsUsed.length > 0 && (
                <p className="mt-3 text-sm text-gray-600">
                  <span className="font-medium">Materials:</span> {s.materialsUsed.join(", ")}
                </p>
              )}

              {s.reflectionPrompts.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700">Reflection prompts</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-600">
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
                      className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
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
                    className="text-sm font-medium text-green-700 hover:text-green-800"
                  >
                    Saved &mdash; view & log an observation
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSave(s, i)}
                    disabled={saveStates[i] === "saving"}
                    className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {saveStates[i] === "saving" ? "Saving…" : "Save to library"}
                  </button>
                )}
                {saveStates[i] === "error" && (
                  <span className="ml-2 text-sm text-red-600">Could not save, try again.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
