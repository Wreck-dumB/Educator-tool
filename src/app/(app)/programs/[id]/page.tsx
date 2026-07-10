import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgram } from "@/lib/supabase/programs";
import { getActivitiesByIds } from "@/lib/supabase/activities";
import { getMaterials } from "@/lib/supabase/materials";
import { getMaterialStatuses, itemsToSource } from "@/lib/materialsMatch";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { sendMaterialAlertNow } from "../actions";
import PrintButton from "@/components/PrintButton";

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [program, myRole] = await Promise.all([getProgram(id), getMyStaffRole()]);
  if (!program) notFound();
  const canAlert = myRole === "director" || myRole === "2ic";

  const today = new Date().toISOString().slice(0, 10);
  const futureEntries = program.entries.filter((e) => e.activity_id && e.day_date >= today);
  const activityIds = [...new Set(futureEntries.map((e) => e.activity_id!))];

  const [activities, inventory] = await Promise.all([
    getActivitiesByIds(activityIds),
    getMaterials(),
  ]);

  const activityById = new Map(activities.map((a) => [a.id, a]));

  // Build consolidated shopping list: material name → { status, neededFor: string[] }
  type ShoppingItem = { name: string; status: "low_stock" | "not_in_inventory"; neededFor: string[] };
  const shoppingMap = new Map<string, ShoppingItem>();

  for (const entry of futureEntries) {
    const activity = activityById.get(entry.activity_id!);
    if (!activity || activity.materials_used.length === 0) continue;
    const statuses = getMaterialStatuses(activity.materials_used, inventory);
    for (const s of itemsToSource(statuses)) {
      const key = s.name.toLowerCase();
      const existing = shoppingMap.get(key);
      if (existing) {
        if (!existing.neededFor.includes(entry.title)) existing.neededFor.push(entry.title);
      } else {
        shoppingMap.set(key, { name: s.name, status: s.status as "low_stock" | "not_in_inventory", neededFor: [entry.title] });
      }
    }
  }

  const shoppingList = Array.from(shoppingMap.values()).sort((a, b) => {
    // not_in_inventory sorts before low_stock
    if (a.status !== b.status) return a.status === "not_in_inventory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const entriesByDay = program.entries.reduce<Record<string, typeof program.entries>>((acc, e) => {
    (acc[e.day_date] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 print:px-0 print:py-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href="/programs" className="text-sm text-coral-dark hover:underline">
          ← Back
        </Link>
        <PrintButton />
      </div>

      <div className="mt-4 print:mt-0">
        <h1 className="font-display text-2xl font-semibold text-coral-dark print:text-black">{program.title}</h1>
        <p className="mt-1 text-sm text-ink/60 print:text-black">
          {new Date(program.start_date).toLocaleDateString()} – {new Date(program.end_date).toLocaleDateString()}
        </p>

        {shoppingList.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 print:hidden">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-amber-900">
                🛒 Materials needed for upcoming activities
              </p>
              <div className="flex items-center gap-2">
                <Link href="/materials" className="text-xs font-medium text-amber-700 hover:underline">
                  Update inventory →
                </Link>
                {canAlert && (
                  <form action={async () => { await sendMaterialAlertNow(); }}>
                    <button type="submit" className="rounded-full border border-amber-400 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100">
                      Alert staff now
                    </button>
                  </form>
                )}
              </div>
            </div>
            <ul className="mt-3 space-y-2">
              {shoppingList.map((item) => (
                <li key={item.name} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    item.status === "not_in_inventory" ? "bg-coral" : "bg-amber-400"
                  }`} />
                  <div>
                    <span className="font-medium text-amber-900">{item.name}</span>
                    {item.status === "low_stock" && (
                      <span className="ml-1.5 text-xs text-amber-700">(low stock)</span>
                    )}
                    <p className="text-xs text-amber-700/80">
                      Needed for: {item.neededFor.join(", ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {program.cultural_days.length > 0 && (
          <div className="mt-4 rounded-xl bg-amber-light p-3 print:rounded-none print:border print:border-black print:bg-white print:text-black">
            <p className="text-sm font-medium text-amber-dark print:text-black">Cultural &amp; national days</p>
            <ul className="mt-1 space-y-1 text-sm text-amber-dark/90 print:text-black">
              {program.cultural_days.map((d, idx) => (
                <li key={idx}>
                  <span className="font-medium">{d.date}:</span> {d.name} ({d.origin})
                  {d.confidence === "approximate" && <span className="ml-1 text-xs italic">— verify exact date</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {Object.entries(entriesByDay).map(([day, entries]) => (
            <div key={day} className="break-inside-avoid">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50 print:text-black">
                {new Date(day).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </p>
              {entries.map((e) => (
                <div key={e.id} className="mt-1 border-b border-ink/10 pb-2">
                  <p className="text-sm font-medium text-ink print:text-black">
                    {e.title}
                    {e.activity_id && (
                      <Link
                        href={`/activities/${e.activity_id}`}
                        className="ml-2 text-xs font-medium text-coral-dark hover:underline print:hidden"
                      >
                        view saved activity →
                      </Link>
                    )}
                  </p>
                  {e.notes && <p className="mt-0.5 text-sm text-ink/70 print:text-black">{e.notes}</p>}
                  {e.eylf_codes.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {e.eylf_codes.map((code) => (
                        <span
                          key={code}
                          className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark print:border print:border-black print:bg-white print:text-black"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-ink/20 pt-4 text-sm text-ink/60 print:text-black">
          <p>Displayed for families on: ______________________</p>
        </div>
      </div>
    </div>
  );
}
