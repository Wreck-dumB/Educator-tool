"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { EylfOutcome, Material, ChildProfile, ActivitySuggestion, DevelopmentalMilestone } from "@/lib/types/domain";
import type { GenerationMode } from "@/lib/types/database.types";
import { saveActivity } from "./save";
import {
  getMaterialIcon,
  getEnergyIcon,
  getGroupIcon,
  getEnergyBadgeClass,
  getMilestoneDomainIcon,
} from "@/lib/icons";

const inputClass =
  "mt-1 block w-full rounded-xl border border-coral-light bg-white px-3 py-2 shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral";

function pillClass(active: boolean) {
  return `rounded-full border px-3 py-1 text-sm transition-colors ${
    active ? "border-coral bg-coral-light text-coral-dark" : "border-coral-light/60 text-ink/70 hover:bg-coral-light/40"
  }`;
}

const AGE_BRACKET_SUGGESTIONS = [
  "Babies (0-12 months)",
  "Toddlers (1-2 years)",
  "Toddlers (2-3 years)",
  "Preschool (3-4 years)",
  "Preschool (4-5 years)",
  "Kindergarten / school age (5+ years)",
  "Mixed age group",
];

interface Props {
  outcomes: EylfOutcome[];
  materials: Material[];
  childProfiles: ChildProfile[];
  milestones: DevelopmentalMilestone[];
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function GenerateForm({ outcomes, materials, childProfiles, milestones }: Props) {
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [adhocMaterials, setAdhocMaterials] = useState("");
  const [timeMinutes, setTimeMinutes] = useState<number | "">("");
  const [groupSize, setGroupSize] = useState("");
  const [energyLevel, setEnergyLevel] = useState("");
  const [selectedOutcomes, setSelectedOutcomes] = useState<Set<string>>(new Set());
  const [childId, setChildId] = useState("");
  const [childQuery, setChildQuery] = useState("");
  const [focusInterest, setFocusInterest] = useState("");
  const [additionalNeeds, setAdditionalNeeds] = useState("");
  const [targetAgeBracket, setTargetAgeBracket] = useState("");
  const [ageBracketFocused, setAgeBracketFocused] = useState(false);
  const [targetMilestone, setTargetMilestone] = useState("");
  const [milestoneFocused, setMilestoneFocused] = useState(false);

  const selectedChild = childProfiles.find((c) => c.id === childId);
  const childMatches =
    !childId && childQuery.trim()
      ? childProfiles.filter((c) => c.first_name.toLowerCase().includes(childQuery.trim().toLowerCase()))
      : [];
  const ageBracketMatches = ageBracketFocused
    ? AGE_BRACKET_SUGGESTIONS.filter((b) => b.toLowerCase().includes(targetAgeBracket.trim().toLowerCase()))
    : [];
  const milestoneMatches = milestoneFocused
    ? milestones
        .filter((m) => m.milestone_text.toLowerCase().includes(targetMilestone.trim().toLowerCase()))
        .slice(0, 8)
    : [];

  function selectChild(child: ChildProfile) {
    setChildId(child.id);
    setChildQuery("");
    setFocusInterest(child.current_interests ?? "");
    setAdditionalNeeds(child.additional_needs ?? "");
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
  const [count, setCount] = useState(5);
  const [quickList, setQuickList] = useState<Set<number>>(new Set());
  const [outcomeDropdownOpen, setOutcomeDropdownOpen] = useState(false);
  const outcomeDropdownRef = useRef<HTMLDivElement>(null);

  const outcomeGroups = outcomes.reduce<Record<number, { title: string; items: EylfOutcome[] }>>((acc, o) => {
    if (!acc[o.outcome_number]) acc[o.outcome_number] = { title: o.outcome_title, items: [] };
    acc[o.outcome_number].items.push(o);
    return acc;
  }, {});

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

  function toggleQuickList(index: number) {
    setQuickList((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (outcomeDropdownRef.current && !outcomeDropdownRef.current.contains(e.target as Node)) {
        setOutcomeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function generate(surpriseMe: boolean) {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setSaveStates({});
    setSavedIds({});
    setQuickList(new Set());

    const adhoc = adhocMaterials
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    const allMaterials = [...selectedMaterials, ...adhoc];
    const trimmedInterest = focusInterest.trim();
    const trimmedNeeds = additionalNeeds.trim();

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
          additionalNeeds: trimmedNeeds || undefined,
          targetAgeBracket: targetAgeBracket.trim() || undefined,
          targetMilestone: targetMilestone.trim() || undefined,
          count,
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

        <div className="mt-4">
          <label htmlFor="additional_needs_field" className="block text-sm font-medium text-ink/70">
            Additional needs (optional)
          </label>
          <textarea
            id="additional_needs_field"
            rows={2}
            value={additionalNeeds}
            onChange={(e) => setAdditionalNeeds(e.target.value)}
            placeholder="e.g. uses a wheelchair, sensory sensitivity to loud noise, recent family change at home"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-ink/50">
            Any physical, emotional, disability, neurodiversity, family, environmental, or legal
            needs/constraints to help the activity adapt respectfully. Selecting a focus child
            fills this in from their saved profile, but you can type your own regardless.
          </p>
        </div>

        <div className="relative mt-4">
          <label htmlFor="age_bracket" className="block text-sm font-medium text-ink/70">
            Target age bracket (optional)
          </label>
          <input
            id="age_bracket"
            type="text"
            value={targetAgeBracket}
            onChange={(e) => setTargetAgeBracket(e.target.value)}
            onFocus={() => setAgeBracketFocused(true)}
            onBlur={() => setAgeBracketFocused(false)}
            placeholder="Search or type, e.g. Toddlers (2-3 years)"
            className={inputClass}
            autoComplete="off"
          />
          {ageBracketMatches.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-xl border border-coral-light bg-white py-1 shadow-md">
              {ageBracketMatches.map((bracket) => (
                <li key={bracket}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setTargetAgeBracket(bracket);
                      setAgeBracketFocused(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-coral-light/40"
                  >
                    {bracket}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-ink/50">
            Pick a common bracket or type your own — keeps the activity&apos;s age-appropriateness
            on target even without a specific focus child selected.
          </p>
        </div>

        <div className="relative mt-4">
          <label htmlFor="milestone_search" className="block text-sm font-medium text-ink/70">
            Target developmental milestone (optional)
          </label>
          <input
            id="milestone_search"
            type="text"
            value={targetMilestone}
            onChange={(e) => setTargetMilestone(e.target.value)}
            onFocus={() => setMilestoneFocused(true)}
            onBlur={() => setMilestoneFocused(false)}
            placeholder="Search, e.g. hops, pincer grasp, two-word sentences"
            className={inputClass}
            autoComplete="off"
          />
          {milestoneMatches.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-xl border border-coral-light bg-white py-1 shadow-md">
              {milestoneMatches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setTargetMilestone(m.milestone_text);
                      setMilestoneFocused(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-coral-light/40"
                  >
                    <span className="text-xs text-ink/40">
                      {getMilestoneDomainIcon(m.domain)} {m.age_band}
                    </span>{" "}
                    {m.milestone_text}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-ink/50">
            Search the{" "}
            <Link href="/milestones" className="underline">
              developmental milestones
            </Link>{" "}
            list to build an activity around a specific skill a child is working towards.
          </p>
        </div>

        {outcomes.length > 0 && (
          <div className="relative mt-4" ref={outcomeDropdownRef}>
            <p className="text-sm font-medium text-ink/70">Target EYLF outcomes (optional)</p>
            <button
              type="button"
              onClick={() => setOutcomeDropdownOpen((o) => !o)}
              className="mt-1 flex w-full items-center justify-between rounded-xl border border-coral-light bg-white px-3 py-2 text-sm shadow-sm hover:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
            >
              <span className={selectedOutcomes.size > 0 ? "font-medium text-coral-dark" : "text-ink/50"}>
                {selectedOutcomes.size > 0
                  ? `${selectedOutcomes.size} outcome${selectedOutcomes.size !== 1 ? "s" : ""} selected`
                  : "Select outcomes…"}
              </span>
              <div className="flex items-center gap-2">
                {selectedOutcomes.size > 0 && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); setSelectedOutcomes(new Set()); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setSelectedOutcomes(new Set()); } }}
                    className="rounded-full bg-coral-light px-2 py-0.5 text-xs text-coral-dark hover:bg-coral hover:text-white"
                  >
                    Clear
                  </span>
                )}
                <svg
                  className={`h-4 w-4 text-ink/40 transition-transform ${outcomeDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {outcomeDropdownOpen && (
              <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-coral-light bg-white shadow-lg">
                {Object.entries(outcomeGroups).map(([num, group]) => (
                  <div key={num}>
                    <p className="sticky top-0 bg-cream px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink/50">
                      Outcome {num}: {group.title}
                    </p>
                    {group.items.map((o) => (
                      <label
                        key={o.id}
                        className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-coral-light/30"
                      >
                        <input
                          type="checkbox"
                          checked={selectedOutcomes.has(o.code)}
                          onChange={() => toggleOutcome(o.code)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-coral"
                        />
                        <span>
                          <span className="text-xs font-semibold text-coral-dark">{o.code}</span>
                          <span className="ml-1.5 text-xs text-ink/70">{o.sub_outcome_text}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {selectedOutcomes.size > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[...selectedOutcomes].map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 rounded-full bg-coral-light px-2 py-0.5 text-xs font-medium text-coral-dark"
                  >
                    {code}
                    <button
                      type="button"
                      onClick={() => toggleOutcome(code)}
                      className="leading-none hover:text-coral"
                      aria-label={`Remove ${code}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <label className="text-sm font-medium text-ink/70">How many ideas?</label>
          <div className="flex gap-1.5">
            {[3, 5, 7, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  count === n
                    ? "bg-coral text-white"
                    : "border border-coral-light/60 text-ink/60 hover:bg-coral-light/40"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

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

      {suggestions.length > 0 && quickList.size > 0 && (
        <div className="mt-6 rounded-2xl border border-sage bg-sage-light p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-sage-dark">Quick list ({quickList.size})</p>
            <button
              type="button"
              onClick={() => setQuickList(new Set())}
              className="text-xs text-sage-dark/60 hover:text-sage-dark"
            >
              Clear
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {[...quickList].sort((a, b) => a - b).map((i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-sage-dark">
                <span className="text-xs text-sage-dark/50">{i + 1}.</span>
                {suggestions[i]?.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-6 space-y-4">
          {suggestions.map((s, i) => (
            <div key={i} className="rounded-2xl border border-coral-light bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold text-ink">{s.title}</h3>
                <button
                  type="button"
                  onClick={() => toggleQuickList(i)}
                  title={quickList.has(i) ? "Remove from quick list" : "Add to quick list"}
                  className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    quickList.has(i)
                      ? "bg-sage text-white hover:bg-sage-dark"
                      : "border border-sage-light text-sage-dark hover:bg-sage-light"
                  }`}
                >
                  {quickList.has(i) ? "★ Listed" : "☆ Quick list"}
                </button>
              </div>
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

              <div className="mt-4 flex flex-wrap items-center gap-3">
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
                {s.suggestedTemplate && (
                  <button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams({
                        type: s.suggestedTemplate!,
                        title: s.title,
                      });
                      if (s.suggestedTemplate === "name_trace" && selectedChild?.first_name) {
                        params.set("name", selectedChild.first_name);
                      }
                      window.open(`/worksheet?${params.toString()}`, "_blank");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-coral-light px-4 py-2 text-sm font-medium text-coral-dark transition-colors hover:bg-coral-light"
                  >
                    🖨 Print worksheet
                  </button>
                )}
                {saveStates[i] === "error" && (
                  <span className="text-sm text-coral-dark">Could not save, try again.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
