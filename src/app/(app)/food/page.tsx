import type { Metadata } from "next";
import { getChildren } from "@/lib/supabase/children";
import { getFoodForDate } from "@/lib/supabase/dailyCare";
import { cardClass, inputClass, primaryButtonClass } from "@/lib/ui";
import { addFoodRecord, deleteFoodRecord } from "./actions";

export const metadata: Metadata = { title: "Food Chart · DR. SparkPlay" };

const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "morning_tea", label: "Morning tea" },
  { value: "lunch", label: "Lunch" },
  { value: "afternoon_tea", label: "Afternoon tea" },
  { value: "late_snack", label: "Late snack" },
  { value: "other", label: "Other" },
] as const;

const AMOUNTS = [
  { value: "all", label: "All" },
  { value: "most", label: "Most" },
  { value: "half", label: "Half" },
  { value: "little", label: "Little" },
  { value: "none", label: "None" },
  { value: "na", label: "N/A" },
] as const;

function amountBadgeClass(amount: string) {
  const map: Record<string, string> = {
    all: "bg-sage-light text-sage-dark",
    most: "bg-sage-light/70 text-sage-dark",
    half: "bg-amber-light text-amber-dark",
    little: "bg-coral-light text-coral-dark",
    none: "bg-coral-light text-coral-dark",
    na: "bg-ink/5 text-ink/40",
  };
  return map[amount] ?? "bg-ink/5 text-ink/50";
}

function todayLocal() {
  return new Date().toISOString().slice(0, 10);
}

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: rawDate } = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "") ? rawDate! : todayLocal();
  const isToday = date === todayLocal();

  const [children, records] = await Promise.all([getChildren(), getFoodForDate(date)]);

  const byChild = new Map<string, typeof records>();
  for (const r of records) {
    const arr = byChild.get(r.child_id) ?? [];
    arr.push(r);
    byChild.set(r.child_id, arr);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-semibold text-coral-dark">Food Chart</h1>
        <p className="mt-1 text-sm text-ink/60">Record what each child ate at each meal.</p>
      </div>

      {/* Date picker */}
      <div className={`mt-5 flex items-center gap-3 p-4 ${cardClass} print:hidden`}>
        <label htmlFor="food-date" className="text-sm font-medium text-ink/70 shrink-0">Date</label>
        <form className="flex flex-1 items-center gap-2">
          <input
            id="food-date"
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
        <p className="mt-6 text-sm text-ink/50">Add children first to use the food chart.</p>
      )}

      <div className="mt-4 space-y-4">
        {children.map((child) => {
          const childRecords = byChild.get(child.id) ?? [];
          return (
            <div key={child.id} className={cardClass}>
              <div className="border-b border-coral-light px-4 py-3">
                <h2 className="font-display font-semibold text-ink">{child.first_name}</h2>
              </div>

              {/* Existing records */}
              {childRecords.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-coral-light/50 text-left text-xs text-ink/40">
                      <th className="px-4 py-2 font-medium">Meal</th>
                      <th className="px-4 py-2 font-medium">Food offered</th>
                      <th className="px-4 py-2 font-medium">Amount</th>
                      <th className="px-4 py-2 font-medium">Notes</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-coral-light/30">
                    {childRecords.map((r) => {
                      const meal = MEAL_TYPES.find((m) => m.value === r.meal_type);
                      return (
                        <tr key={r.id}>
                          <td className="px-4 py-2 text-ink/70">{meal?.label ?? r.meal_type}</td>
                          <td className="px-4 py-2 text-ink">{r.food_offered}</td>
                          <td className="px-4 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${amountBadgeClass(r.amount_eaten)}`}>
                              {AMOUNTS.find((a) => a.value === r.amount_eaten)?.label ?? r.amount_eaten}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs text-ink/40">{r.notes ?? ""}</td>
                          <td className="px-2 py-2">
                            <form action={deleteFoodRecord}>
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="date" value={date} />
                              <button type="submit" className="text-ink/30 hover:text-coral-dark" title="Remove">×</button>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Add new record */}
              <form action={addFoodRecord} className="flex flex-wrap items-end gap-3 p-4 border-t border-coral-light/30">
                <input type="hidden" name="child_id" value={child.id} />
                <input type="hidden" name="date" value={date} />
                <div>
                  <label className="block text-xs font-medium text-ink/50">Meal</label>
                  <select name="meal_type" className={`${inputClass} py-1`}>
                    {MEAL_TYPES.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-36">
                  <label className="block text-xs font-medium text-ink/50">Food offered</label>
                  <input type="text" name="food_offered" required placeholder="e.g. banana, rice crackers" className={`${inputClass} py-1`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink/50">Amount eaten</label>
                  <select name="amount_eaten" className={`${inputClass} py-1`}>
                    {AMOUNTS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-28">
                  <label className="block text-xs font-medium text-ink/50">Notes</label>
                  <input type="text" name="notes" placeholder="optional" className={`${inputClass} py-1`} />
                </div>
                <button type="submit" className={`${primaryButtonClass} py-1.5 shrink-0`}>
                  + Add
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
