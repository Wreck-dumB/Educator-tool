import { getHandoverNotes } from "@/lib/supabase/handover";
import { getMyStaffRole, getMyService } from "@/lib/supabase/staff";
import { getStaffMembers } from "@/lib/supabase/staff";
import { inputClass, cardClass, primaryButtonClass, secondaryButtonClass, errorBannerClass } from "@/lib/ui";
import { createHandoverNote, acknowledgeHandover, deleteHandoverNote } from "./actions";

const SHIFT_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  full_day: "Full day",
  split: "Split",
};

export default async function HandoverPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [notes, myRole, service] = await Promise.all([
    getHandoverNotes(14),
    getMyStaffRole(),
    getMyService(),
  ]);

  const staffMembers = service ? await getStaffMembers(service.id) : [];
  const isDirector = myRole === "director";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Shift handover</h1>
      <p className="mt-1 text-sm text-ink/60">
        Digital handover book. Outgoing shift writes a note; incoming shift acknowledges it
        before starting. Keep notes about children general — avoid identifying details.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      {/* ─── Write handover note ──────────────────────────────────────────── */}
      <div className={`mt-6 ${cardClass} p-5`}>
        <h2 className="mb-4 text-lg font-semibold text-ink">Write handover note</h2>
        <form action={createHandoverNote} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink">Shift date</label>
              <input type="date" name="shift_date" defaultValue={today} required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Shift</label>
              <select name="shift_type" required className={inputClass}>
                {Object.entries(SHIFT_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">General notes</label>
            <textarea name="general_notes" rows={3} className={inputClass} placeholder="Room mood, any themes or focus areas, weather impact…" />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Children notes</label>
            <textarea name="children_notes" rows={3} className={inputClass} placeholder="Sleeps, meals, any children needing follow-up (first name only)…" />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Medication summary</label>
            <textarea name="medication_summary" rows={2} className={inputClass} placeholder="Any medications given this shift, or none…" />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Incidents summary</label>
            <textarea name="incidents_summary" rows={2} className={inputClass} placeholder="Any incidents or injuries to follow up…" />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Outstanding tasks</label>
            <textarea name="outstanding_tasks" rows={2} className={inputClass} placeholder="What the next shift needs to action…" />
          </div>

          <div className="flex justify-end">
            <button type="submit" className={primaryButtonClass}>Save handover note</button>
          </div>
        </form>
      </div>

      {/* ─── Handover history ─────────────────────────────────────────────── */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-ink">Recent handover notes</h2>
        {notes.length === 0 ? (
          <p className="text-sm text-ink/50">No handover notes yet.</p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => {
              const writer = staffMembers.find((s) => s.user_id === note.written_by_user_id);
              const acknowledger = note.acknowledged_by_user_id
                ? staffMembers.find((s) => s.user_id === note.acknowledged_by_user_id)
                : null;

              return (
                <div key={note.id} className={`${cardClass} p-4`}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">
                        {note.shift_date} · {SHIFT_LABELS[note.shift_type] ?? note.shift_type} shift
                      </p>
                      <p className="text-xs text-ink/50">
                        Written by {writer?.displayName ?? "staff"} at{" "}
                        {new Date(note.created_at).toLocaleTimeString("en-AU", { timeStyle: "short" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {note.acknowledged_at ? (
                        <span className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark">
                          Acknowledged by {acknowledger?.displayName ?? "staff"}
                        </span>
                      ) : (
                        <form action={acknowledgeHandover.bind(null, note.id)}>
                          <button type="submit" className={secondaryButtonClass}>
                            Acknowledge
                          </button>
                        </form>
                      )}
                      {isDirector && (
                        <form action={deleteHandoverNote.bind(null, note.id)}>
                          <button type="submit" className="text-xs text-ink/30 hover:text-coral-dark">
                            Delete
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {note.general_notes && (
                      <div>
                        <p className="font-medium text-ink/70">General</p>
                        <p className="text-ink/80 whitespace-pre-wrap">{note.general_notes}</p>
                      </div>
                    )}
                    {note.children_notes && (
                      <div>
                        <p className="font-medium text-ink/70">Children</p>
                        <p className="text-ink/80 whitespace-pre-wrap">{note.children_notes}</p>
                      </div>
                    )}
                    {note.medication_summary && (
                      <div>
                        <p className="font-medium text-ink/70">Medications</p>
                        <p className="text-ink/80 whitespace-pre-wrap">{note.medication_summary}</p>
                      </div>
                    )}
                    {note.incidents_summary && (
                      <div>
                        <p className="font-medium text-ink/70">Incidents</p>
                        <p className="text-ink/80 whitespace-pre-wrap">{note.incidents_summary}</p>
                      </div>
                    )}
                    {note.outstanding_tasks && (
                      <div>
                        <p className="font-medium text-ink/70">Outstanding tasks</p>
                        <p className="text-ink/80 whitespace-pre-wrap">{note.outstanding_tasks}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
