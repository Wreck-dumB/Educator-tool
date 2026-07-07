import type { Metadata } from "next";
import { getChildren } from "@/lib/supabase/children";
import { getNappyForDate } from "@/lib/supabase/dailyCare";
import { cardClass, inputClass, primaryButtonClass } from "@/lib/ui";
import { addNappyRecord, deleteNappyRecord } from "./actions";

export const metadata: Metadata = { title: "Nappy Chart · SparkPlay" };

const NAPPY_TYPES = [
  { value: "wet", label: "Wet" },
  { value: "dirty", label: "Dirty" },
  { value: "both", label: "Wet + Dirty" },
  { value: "dry", label: "Dry" },
  { value: "na", label: "N/A" },
] as const;

function nappyBadgeClass(type: string) {
  const map: Record<string, string> = {
    wet: "bg-sage-light text-sage-dark",
    dirty: "bg-amber-light text-amber-dark",
    both: "bg-amber-light text-amber-dark",
    dry: "bg-ink/5 text-ink/50",
    na: "bg-ink/5 text-ink/30",
  };
  return map[type] ?? "bg-ink/5 text-ink/50";
}

function todayLocal() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

export default async function NappyPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: rawDate } = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "") ? rawDate! : todayLocal();
  const isToday = date === todayLocal();

  const [children, records] = await Promise.all([getChildren(), getNappyForDate(date)]);

  const byChild = new Map<string, typeof records>();
  for (const r of records) {
    const arr = byChild.get(r.child_id) ?? [];
    arr.push(r);
    byChild.set(r.child_id, arr);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-semibold text-coral-dark">Nappy Chart</h1>
        <p className="mt-1 text-sm text-ink/60">Record nappy changes for each child throughout the day.</p>
      </div>

      {/* Date picker */}
      <div className={`mt-5 flex items-center gap-3 p-4 ${cardClass} print:hidden`}>
        <label htmlFor="nappy-date" className="text-sm font-medium text-ink/70 shrink-0">Date</label>
        <form className="flex flex-1 items-center gap-2">
          <input
            id="nappy-date"
            name="date"
            type="date"
            defaultValue={date}
            className="flex-1 rounded-xl border border-coral-light bg-white px-3 py-1.5 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          />
          <button type="submit" className="rounded-full bg-coral px-4 py-1.5 text-sm font-semibold text-white hover:bg-coral-dark">
            Go
          </button>
        </form>
        {isToday && (
          <span className="shrink-0 rounded-full bg-sage-light px-2.5 py-0.5 text-xs font-semibold text-sage-dark">Today</span>
        )}
      </div>

      {children.length === 0 && (
        <p className="mt-6 text-sm text-ink/50">Add children first to use the nappy chart.</p>
      )}

      <div className="mt-4 space-y-4">
        {children.map((child) => {
          const childRecords = byChild.get(child.id) ?? [];
          const changeCount = childRecords.filter((r) => r.nappy_type !== "na").length;
          return (
            <div key={child.id} className={cardClass}>
              <div className="flex items-center justify-between border-b border-coral-light px-4 py-3">
                <h2 className="font-display font-semibold text-ink">{child.first_name}</h2>
                {changeCount > 0 && (
                  <span className="text-xs text-ink/40">{changeCount} change{changeCount !== 1 ? "s" : ""}</span>
                )}
              </div>

              {/* Existing records */}
              {childRecords.length > 0 && (
                <ul className="divide-y divide-coral-light/40">
                  {childRecords.map((r) => {
                    const typeInfo = NAPPY_TYPES.find((t) => t.value === r.nappy_type);
                    return (
                      <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        <span className="font-medium tabular-nums text-ink">{r.changed_at}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${nappyBadgeClass(r.nappy_type)}`}>
                          {typeInfo?.label ?? r.nappy_type}
                        </span>
                        {r.notes && <span className="ml-auto text-xs text-ink/40">{r.notes}</span>}
                        <form action={deleteNappyRecord}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="date" value={date} />
                          <button type="submit" className="text-xs text-ink/30 hover:text-coral-dark" title="Remove">×</button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Add new record */}
              <form action={addNappyRecord} className="flex flex-wrap items-end gap-3 p-4 border-t border-coral-light/30">
                <input type="hidden" name="child_id" value={child.id} />
                <input type="hidden" name="date" value={date} />
                <div>
                  <label className="block text-xs font-medium text-ink/50">Time</label>
                  <input
                    type="time"
                    name="changed_at"
                    required
                    defaultValue={isToday ? nowTime() : ""}
                    suppressHydrationWarning
                    className={`${inputClass} w-32 py-1`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink/50">Type</label>
                  <select name="nappy_type" className={`${inputClass} py-1`}>
                    {NAPPY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-28">
                  <label className="block text-xs font-medium text-ink/50">Notes</label>
                  <input type="text" name="notes" placeholder="optional" className={`${inputClass} py-1`} />
                </div>
                <button type="submit" className={`${primaryButtonClass} py-1.5 shrink-0`}>
                  + Log
                </button>
              </form>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-ink/30 print:hidden">
        All changes are logged against today&apos;s date. Use the date picker above to view or backfill previous days.
      </p>
    </div>
  );
}
