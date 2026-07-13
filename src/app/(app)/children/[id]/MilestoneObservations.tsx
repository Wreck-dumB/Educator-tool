"use client";

import { useState, useTransition } from "react";
import type { DevelopmentalMilestone } from "@/lib/types/domain";
import { getMilestoneDomainLabel } from "@/lib/icons";

interface MilestoneObs {
  id: string;
  milestone_id: string | null;
  custom_milestone_text: string | null;
  observed_at: string;
  notes: string | null;
}

interface Props {
  childId: string;
  initialObservations: MilestoneObs[];
  milestones: DevelopmentalMilestone[];
}

export default function MilestoneObservations({ childId, initialObservations, milestones }: Props) {
  const [observations, setObservations] = useState<MilestoneObs[]>(initialObservations);
  const [selectedMilestone, setSelectedMilestone] = useState("");
  const [customText, setCustomText] = useState("");
  const [notes, setNotes] = useState("");
  const [observedAt, setObservedAt] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<"from_list" | "custom">("from_list");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const milestoneMap = new Map(milestones.map((m) => [m.id, m]));

  async function handleAdd() {
    setError(null);
    if (mode === "from_list" && !selectedMilestone) {
      setError("Select a milestone.");
      return;
    }
    if (mode === "custom" && !customText.trim()) {
      setError("Enter a milestone description.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/milestone-observation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          milestoneId: mode === "from_list" ? selectedMilestone : null,
          customMilestoneText: mode === "custom" ? customText.trim() : null,
          observedAt,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      setObservations((prev) => [data, ...prev]);
      setSelectedMilestone("");
      setCustomText("");
      setNotes("");
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      await fetch(`/api/milestone-observation?id=${id}`, { method: "DELETE" });
      setObservations((prev) => prev.filter((o) => o.id !== id));
    });
  }

  const byAgeBand = milestones.reduce<Record<string, DevelopmentalMilestone[]>>(
    (acc, m) => { (acc[m.age_band] ??= []).push(m); return acc; },
    {},
  );
  const ageBands = Object.keys(byAgeBand).sort(
    (a, b) => byAgeBand[a][0].age_band_order - byAgeBand[b][0].age_band_order,
  );

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="flex gap-3 mb-2">
        <button
          type="button"
          onClick={() => setMode("from_list")}
          className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
            mode === "from_list" ? "bg-coral text-white border-coral" : "border-coral-light text-ink/60 hover:bg-coral-light/50"
          }`}
        >
          From milestone list
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
            mode === "custom" ? "bg-coral text-white border-coral" : "border-coral-light text-ink/60 hover:bg-coral-light/50"
          }`}
        >
          Custom milestone
        </button>
      </div>

      {mode === "from_list" ? (
        <select
          value={selectedMilestone}
          onChange={(e) => setSelectedMilestone(e.target.value)}
          className="block w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
        >
          <option value="" disabled>Select a milestone…</option>
          {ageBands.map((band) => (
            <optgroup key={band} label={band}>
              {byAgeBand[band].map((m) => (
                <option key={m.id} value={m.id}>
                  [{getMilestoneDomainLabel(m.domain)}] {m.milestone_text}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Describe the milestone observed…"
          className="block w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
        />
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="block w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          />
        </div>
        <div>
          <input
            type="date"
            value={observedAt}
            onChange={(e) => setObservedAt(e.target.value)}
            className="block rounded-xl border border-coral-light bg-white px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending}
          className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral-dark disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {error && (
        <p className="text-xs text-coral-dark bg-coral-light rounded-lg px-3 py-2">{error}</p>
      )}

      {/* List */}
      {observations.length === 0 ? (
        <p className="text-sm text-ink/40">No milestone observations recorded yet.</p>
      ) : (
        <ul className="divide-y divide-coral-light/50">
          {observations.map((obs) => {
            const milestone = obs.milestone_id ? milestoneMap.get(obs.milestone_id) : null;
            const label = milestone?.milestone_text ?? obs.custom_milestone_text ?? "Unknown milestone";
            const domain = milestone ? getMilestoneDomainLabel(milestone.domain) : null;
            return (
              <li key={obs.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {domain && (
                    <span className="text-xs text-ink/40 font-medium">{domain} · </span>
                  )}
                  <span className="text-sm text-ink/80">{label}</span>
                  {obs.notes && (
                    <p className="text-xs text-ink/50 mt-0.5">{obs.notes}</p>
                  )}
                  <p className="text-xs text-ink/30 mt-0.5">
                    {new Date(obs.observed_at).toLocaleDateString("en-AU")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(obs.id)}
                  disabled={pending}
                  className="shrink-0 text-xs text-coral-dark hover:underline"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
