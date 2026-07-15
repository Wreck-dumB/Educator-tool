import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChildren } from "@/lib/supabase/children";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import {
  getPhysicalActivityForDate,
  getNutritionEducationForDate,
  getWeeklyActivitySummary,
  ACTIVITY_CATEGORY_LABELS,
  NUTRITION_TYPE_LABELS,
  MOVEMENT_SKILLS,
} from "@/lib/supabase/physical-activity";
import { cardClass } from "@/lib/ui";
import { ChildSelector } from "./ChildSelector";
import {
  logPhysicalActivity,
  logNutritionEducation,
  deletePhysicalActivityLog,
  deleteNutritionEducationLog,
} from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Physical Activity & Nutrition · DR. SparkPlay",
};

function todayLocal() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

function getWeekBounds(date: string) {
  const d = new Date(date + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { weekStart: fmt(mon), weekEnd: fmt(fri) };
}

const GROUP_LABELS: Record<string, string> = {
  individual: "Individual",
  small_group: "Small group",
  whole_group: "Whole group",
};

export default async function PhysicalActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const today = todayLocal();
  const selectedDate = params.date ?? today;
  const { weekStart, weekEnd } = getWeekBounds(selectedDate);

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/");

  const [children, physicalLogs, nutritionLogs, weekSummary] = await Promise.all([
    getChildren(),
    getPhysicalActivityForDate(ownerUserId, selectedDate),
    getNutritionEducationForDate(ownerUserId, selectedDate),
    getWeeklyActivitySummary(ownerUserId, weekStart, weekEnd),
  ]);

  // Build child name map
  const childNames = new Map(children.map((c) => [c.id, c.first_name]));

  // Group logs by child for the summary view
  const physicalByChild = new Map<string, typeof physicalLogs>();
  for (const log of physicalLogs) {
    const arr = physicalByChild.get(log.child_id) ?? [];
    arr.push(log);
    physicalByChild.set(log.child_id, arr);
  }
  const nutritionByChild = new Map<string, typeof nutritionLogs>();
  for (const log of nutritionLogs) {
    const arr = nutritionByChild.get(log.child_id) ?? [];
    arr.push(log);
    nutritionByChild.set(log.child_id, arr);
  }

  const allChildIds = new Set([...physicalByChild.keys(), ...nutritionByChild.keys()]);
  const displayDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const weekLabel =
    weekStart === weekEnd
      ? displayDate
      : `${new Date(weekStart + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${new Date(weekEnd + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`;

  return (
    <div>
      <div className="mb-1 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">
            Physical Activity & Nutrition
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            Log movement and nutrition education sessions. Supports Munch &amp; Move
            documentation — EYLF Outcome 3.
          </p>
        </div>
      </div>

      {/* Date picker */}
      <form method="get" className="mt-4 flex items-center gap-2">
        <input
          type="date"
          name="date"
          defaultValue={selectedDate}
          max={today}
          className="rounded-xl border border-coral-light px-3 py-1.5 text-sm text-ink focus:border-coral focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-xl bg-coral px-3 py-1.5 text-sm font-semibold text-white hover:bg-coral-dark"
        >
          Go
        </button>
      </form>
      <p className="mt-2 text-sm font-semibold text-ink/50">{displayDate}</p>

      {children.length === 0 ? (
        <p className={`mt-6 p-5 text-sm text-ink/50 ${cardClass}`}>
          No children enrolled yet. Add children under Enrolments before logging activities.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ── Physical Activity form ── */}
          <div className={cardClass}>
            <div className="border-b border-coral-light px-4 py-3">
              <h2 className="font-display text-sm font-semibold text-ink">
                🏃 Log Physical Activity
              </h2>
            </div>
            <form action={logPhysicalActivity} className="space-y-3 px-4 py-4">
              <input type="hidden" name="date" value={selectedDate} />

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                  Children
                </label>
                <ChildSelector children={children.map((c) => ({ id: c.id, first_name: c.first_name }))} name="child_ids" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                  Activity type
                </label>
                <select
                  name="activity_category"
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {Object.entries(ACTIVITY_CATEGORY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                  Movement skills practised
                </label>
                <div className="flex flex-wrap gap-2">
                  {MOVEMENT_SKILLS.map((skill) => (
                    <label key={skill} className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        name="movement_skills"
                        value={skill}
                        className="accent-coral"
                      />
                      <span className="text-sm capitalize text-ink/70">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    name="duration_minutes"
                    min={1}
                    max={480}
                    required
                    placeholder="e.g. 20"
                    className="w-full rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                    Group size
                  </label>
                  <select
                    name="group_context"
                    defaultValue="whole_group"
                    className="w-full rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
                  >
                    <option value="whole_group">Whole group</option>
                    <option value="small_group">Small group</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                  Notes (optional)
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="What did the children do? Any observations?"
                  className="w-full resize-none rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-coral py-2.5 text-sm font-semibold text-white hover:bg-coral-dark"
              >
                Save activity
              </button>
            </form>
          </div>

          {/* ── Nutrition Education form ── */}
          <div className={cardClass}>
            <div className="border-b border-coral-light px-4 py-3">
              <h2 className="font-display text-sm font-semibold text-ink">
                🥦 Log Nutrition Education
              </h2>
            </div>
            <form action={logNutritionEducation} className="space-y-3 px-4 py-4">
              <input type="hidden" name="date" value={selectedDate} />

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                  Children
                </label>
                <ChildSelector children={children.map((c) => ({ id: c.id, first_name: c.first_name }))} name="child_ids" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                  Activity type
                </label>
                <select
                  name="activity_type"
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {Object.entries(NUTRITION_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                  Food / topic focus
                </label>
                <input
                  type="text"
                  name="food_focus"
                  required
                  placeholder="e.g. fruit salad, growing tomatoes, whole grains"
                  className="w-full rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    name="duration_minutes"
                    min={1}
                    max={480}
                    required
                    placeholder="e.g. 15"
                    className="w-full rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                    Group size
                  </label>
                  <select
                    name="group_context"
                    defaultValue="whole_group"
                    className="w-full rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink focus:border-coral focus:outline-none"
                  >
                    <option value="whole_group">Whole group</option>
                    <option value="small_group">Small group</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                  Notes (optional)
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="How did the children engage? Any highlights?"
                  className="w-full resize-none rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-sage py-2.5 text-sm font-semibold text-white hover:bg-sage-dark"
              >
                Save session
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Weekly minutes summary ── */}
      {weekSummary.length > 0 && (
        <div className={`mt-6 ${cardClass}`}>
          <div className="border-b border-coral-light px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-ink">
              Weekly activity minutes — {weekLabel}
            </h2>
            <p className="mt-0.5 text-xs text-ink/40">
              WHO guideline: 180 min/day (3 hrs) for under-5s
            </p>
          </div>
          <ul className="divide-y divide-coral-light">
            {weekSummary
              .sort((a, b) => b.total_minutes - a.total_minutes)
              .map(({ child_id, total_minutes }) => {
                const name = childNames.get(child_id) ?? "Unknown";
                const pct = Math.min(100, (total_minutes / (5 * 180)) * 100);
                const isLow = total_minutes < 5 * 60;
                return (
                  <li key={child_id} className="px-4 py-3">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{name}</span>
                      <span
                        className={`text-xs font-semibold ${isLow ? "text-coral-dark" : "text-sage-dark"}`}
                      >
                        {total_minutes} min this week
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-ink/5">
                      <div
                        className={`h-full rounded-full transition-all ${isLow ? "bg-coral" : "bg-sage"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      {/* ── Today's log ── */}
      {(physicalLogs.length > 0 || nutritionLogs.length > 0) && (
        <div className={`mt-6 ${cardClass}`}>
          <div className="border-b border-coral-light px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-ink">
              Today&apos;s log — {displayDate}
            </h2>
          </div>

          {allChildIds.size > 0 && (
            <ul className="divide-y divide-coral-light">
              {[...allChildIds].map((childId) => {
                const physical = physicalByChild.get(childId) ?? [];
                const nutrition = nutritionByChild.get(childId) ?? [];
                const name = childNames.get(childId) ?? "Unknown";
                const totalMins = physical.reduce((s, l) => s + l.duration_minutes, 0);
                return (
                  <li key={childId} className="px-4 py-4">
                    <p className="mb-2 font-display text-sm font-semibold text-ink">
                      🧒 {name}
                      {totalMins > 0 && (
                        <span className="ml-2 text-xs font-normal text-sage-dark">
                          {totalMins} min activity today
                        </span>
                      )}
                    </p>

                    {physical.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-ink/40">
                          Physical activity
                        </p>
                        <ul className="space-y-1.5">
                          {physical.map((log) => (
                            <li
                              key={log.id}
                              className="flex items-start justify-between gap-3 rounded-xl bg-sage-light/30 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-ink">
                                  {ACTIVITY_CATEGORY_LABELS[log.activity_category]} ·{" "}
                                  {log.duration_minutes} min
                                </p>
                                {log.movement_skills.length > 0 && (
                                  <p className="mt-0.5 text-xs text-ink/50">
                                    Skills: {log.movement_skills.join(", ")}
                                  </p>
                                )}
                                {log.notes && (
                                  <p className="mt-0.5 text-xs text-ink/60">{log.notes}</p>
                                )}
                                <p className="mt-0.5 text-xs text-ink/30">
                                  {GROUP_LABELS[log.group_context]}
                                </p>
                              </div>
                              <form action={deletePhysicalActivityLog}>
                                <input type="hidden" name="id" value={log.id} />
                                <button
                                  type="submit"
                                  className="shrink-0 text-xs text-ink/20 hover:text-coral-dark"
                                >
                                  ✕
                                </button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {nutrition.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-ink/40">
                          Nutrition education
                        </p>
                        <ul className="space-y-1.5">
                          {nutrition.map((log) => (
                            <li
                              key={log.id}
                              className="flex items-start justify-between gap-3 rounded-xl bg-amber-light/30 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-ink">
                                  {NUTRITION_TYPE_LABELS[log.activity_type]} ·{" "}
                                  {log.duration_minutes} min
                                </p>
                                <p className="mt-0.5 text-xs font-medium text-ink/60">
                                  {log.food_focus}
                                </p>
                                {log.notes && (
                                  <p className="mt-0.5 text-xs text-ink/60">{log.notes}</p>
                                )}
                                <p className="mt-0.5 text-xs text-ink/30">
                                  {GROUP_LABELS[log.group_context]}
                                </p>
                              </div>
                              <form action={deleteNutritionEducationLog}>
                                <input type="hidden" name="id" value={log.id} />
                                <button
                                  type="submit"
                                  className="shrink-0 text-xs text-ink/20 hover:text-coral-dark"
                                >
                                  ✕
                                </button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
