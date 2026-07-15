import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getChildren } from "@/lib/supabase/children";
import { getSharedObservationsForParent, getSignedPhotoUrl } from "@/lib/supabase/observations";
import {
  getPhysicalActivityForParent,
  getNutritionEducationForParent,
  ACTIVITY_CATEGORY_LABELS,
  NUTRITION_TYPE_LABELS,
} from "@/lib/supabase/physical-activity";
import { cardClass } from "@/lib/ui";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Daily Diary · DR. SparkPlay" };

function todayAEST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

function formatTime(t: string | null) {
  if (!t) return "";
  const d = new Date(t);
  return d.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Australia/Sydney",
  });
}

function formatTimeFromTimeStr(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const display = h % 12 || 12;
  return `${display}:${m.toString().padStart(2, "0")}${suffix}`;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  morning_tea: "Morning tea",
  lunch: "Lunch",
  afternoon_tea: "Afternoon tea",
  late_snack: "Late snack",
  other: "Other",
};

const AMOUNT_LABELS: Record<string, string> = {
  all: "Ate all",
  most: "Ate most",
  half: "Ate half",
  little: "Ate a little",
  none: "Didn't eat",
  na: "N/A",
};

const NAPPY_LABELS: Record<string, string> = {
  wet: "Wet",
  dirty: "Dirty",
  both: "Wet & dirty",
  dry: "Dry",
  na: "N/A",
};

const WELLBEING_LABELS: Record<number, { label: string; colour: string }> = {
  1: { label: "Unsettled", colour: "bg-coral-light text-coral-dark" },
  2: { label: "Okay", colour: "bg-amber-light text-amber-dark" },
  3: { label: "Good", colour: "bg-ink/5 text-ink/60" },
  4: { label: "Happy", colour: "bg-sage-light text-sage-dark" },
  5: { label: "Great day!", colour: "bg-sage text-white" },
};

export default async function ParentDiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; date?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const today = todayAEST();
  const selectedDate = params.date ?? today;
  const children = await getChildren();

  const selectedChildId = params.child ?? children[0]?.id;
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? children[0];

  if (!selectedChild) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold text-coral-dark">Daily Diary</h1>
        <p className={`mt-6 p-5 text-sm text-ink/50 ${cardClass}`}>
          No children are linked to your account yet.
        </p>
      </div>
    );
  }

  const [sleepRes, foodRes, nappyRes, attendanceRes, allSharedObs, physicalActivity, nutritionEd] =
    await Promise.all([
      supabase
        .from("daily_sleep")
        .select("id, sleep_start, sleep_end, notes")
        .eq("child_id", selectedChild.id)
        .eq("date", selectedDate)
        .order("sleep_start"),
      supabase
        .from("daily_food")
        .select("id, meal_type, food_offered, amount_eaten, notes")
        .eq("child_id", selectedChild.id)
        .eq("date", selectedDate)
        .order("created_at"),
      supabase
        .from("daily_nappy")
        .select("id, changed_at, nappy_type, notes")
        .eq("child_id", selectedChild.id)
        .eq("date", selectedDate)
        .order("changed_at"),
      supabase
        .from("attendance_records")
        .select("signed_in_at, signed_out_at, wellbeing_level, wellbeing_note")
        .eq("child_id", selectedChild.id)
        .eq("date", selectedDate)
        .maybeSingle(),
      getSharedObservationsForParent(selectedChild.id),
      getPhysicalActivityForParent(selectedChild.id, selectedDate),
      getNutritionEducationForParent(selectedChild.id, selectedDate),
    ]);

  const sleep = sleepRes.data ?? [];
  const food = foodRes.data ?? [];
  const nappy = nappyRes.data ?? [];
  const attendance = attendanceRes.data ?? null;

  // Filter shared observations to those observed on the selected date (AEST)
  const observations = allSharedObs.filter((o) => {
    const obsDate = new Date(o.observed_at).toLocaleDateString("en-CA", {
      timeZone: "Australia/Sydney",
    });
    return obsDate === selectedDate;
  });

  // Resolve signed photo URLs
  const photoUrls = new Map<string, string>();
  await Promise.all(
    observations
      .filter((o) => o.photo_url)
      .map(async (o) => {
        const url = await getSignedPhotoUrl(o.photo_url!);
        if (url) photoUrls.set(o.id, url);
      }),
  );

  const isSignedOut = !!attendance?.signed_out_at;
  const hasAny =
    sleep.length > 0 ||
    food.length > 0 ||
    nappy.length > 0 ||
    observations.length > 0 ||
    physicalActivity.length > 0 ||
    nutritionEd.length > 0 ||
    attendance !== null;

  const displayDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Daily Diary</h1>
      <p className="mt-1 text-sm text-ink/60">
        What happened at the service today — activities, meals, sleep, nappy changes.
      </p>

      {/* Child + date pickers */}
      <div className="mt-4 flex flex-wrap gap-3">
        {children.length > 1 && (
          <div className="flex gap-2">
            {children.map((c) => (
              <a
                key={c.id}
                href={`/parent/diary?child=${c.id}&date=${selectedDate}`}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  c.id === selectedChild.id
                    ? "bg-coral text-white"
                    : "border border-coral-light text-ink/60 hover:bg-coral-light"
                }`}
              >
                {c.first_name}
              </a>
            ))}
          </div>
        )}
        <form method="get" className="flex items-center gap-2">
          {params.child && <input type="hidden" name="child" value={params.child} />}
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
      </div>

      <p className="mt-4 text-sm font-semibold text-ink/50">
        {displayDate} · {selectedChild.first_name}
      </p>

      {!hasAny ? (
        <p className={`mt-4 p-5 text-sm text-ink/50 ${cardClass}`}>
          No diary entries recorded yet for this day. Your educator will update this throughout the
          day.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">

          {/* Day recap header — shown when child has been signed out */}
          {attendance && (
            <div className={`${cardClass} border-sage-light bg-sage-light/30`}>
              <div className="px-4 py-3">
                <h2 className="font-display text-sm font-semibold text-sage-dark">
                  {isSignedOut ? "Day complete" : "Currently at the service"}
                </h2>
                <div className="mt-1 flex flex-wrap gap-4 text-sm text-ink/70">
                  {attendance.signed_in_at && (
                    <span>
                      Arrived{" "}
                      <strong className="text-ink">{formatTime(attendance.signed_in_at)}</strong>
                    </span>
                  )}
                  {attendance.signed_out_at && (
                    <span>
                      Signed out{" "}
                      <strong className="text-ink">{formatTime(attendance.signed_out_at)}</strong>
                    </span>
                  )}
                </div>
                {attendance.wellbeing_level && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-ink/50">Wellbeing:</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        WELLBEING_LABELS[attendance.wellbeing_level]?.colour ?? "bg-ink/5 text-ink/60"
                      }`}
                    >
                      {WELLBEING_LABELS[attendance.wellbeing_level]?.label ?? `${attendance.wellbeing_level}/5`}
                    </span>
                    {attendance.wellbeing_note && (
                      <span className="text-xs text-ink/50">{attendance.wellbeing_note}</span>
                    )}
                  </div>
                )}
                <div className="mt-2 flex gap-4 text-xs text-ink/40">
                  {nappy.length > 0 && (
                    <span>🧷 {nappy.length} nappy change{nappy.length !== 1 ? "s" : ""}</span>
                  )}
                  {food.length > 0 && (
                    <span>🍽️ {food.length} meal{food.length !== 1 ? "s" : ""} recorded</span>
                  )}
                  {sleep.length > 0 && <span>😴 {sleep.length} rest period{sleep.length !== 1 ? "s" : ""}</span>}
                  {observations.length > 0 && (
                    <span>📸 {observations.length} observation{observations.length !== 1 ? "s" : ""} shared</span>
                  )}
                  {physicalActivity.length > 0 && (
                    <span>🏃 {physicalActivity.reduce((s, l) => s + l.duration_minutes, 0)} min active</span>
                  )}
                  {nutritionEd.length > 0 && (
                    <span>🥦 {nutritionEd.length} nutrition session{nutritionEd.length !== 1 ? "s" : ""}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Observations / activities with photos */}
          {observations.length > 0 && (
            <div className={cardClass}>
              <div className="border-b border-coral-light px-4 py-3">
                <h2 className="font-display text-sm font-semibold text-ink">
                  Activities & observations 📸
                </h2>
              </div>
              <ul className="divide-y divide-coral-light">
                {observations.map((o) => {
                  const photoUrl = photoUrls.get(o.id);
                  return (
                    <li key={o.id} className="flex gap-3 px-4 py-3">
                      {photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoUrl}
                          alt="Activity photo"
                          className="h-20 w-20 shrink-0 rounded-xl object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-ink/40">
                          {new Date(o.observed_at).toLocaleTimeString("en-AU", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                            timeZone: "Australia/Sydney",
                          })}
                          {o.activity_title && (
                            <span className="ml-1.5 font-medium text-sage-dark">
                              · {o.activity_title}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-sm text-ink/80">{o.note_text}</p>
                        {o.eylf_codes.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {o.eylf_codes.map((code) => (
                              <span
                                key={code}
                                className="rounded-full bg-sage-light px-2 py-0.5 text-[10px] font-medium text-sage-dark"
                              >
                                EYLF {code}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-coral-light px-4 py-2">
                <Link
                  href={`/parent/observations?child=${selectedChild.id}`}
                  className="text-xs font-medium text-coral-dark hover:underline"
                >
                  View all observations →
                </Link>
              </div>
            </div>
          )}

          {/* Sleep */}
          {sleep.length > 0 && (
            <div className={cardClass}>
              <div className="border-b border-coral-light px-4 py-3">
                <h2 className="font-display text-sm font-semibold text-ink">Sleep / Rest 😴</h2>
              </div>
              <ul className="divide-y divide-coral-light">
                {sleep.map((s) => {
                  const duration = s.sleep_end
                    ? (() => {
                        const [sh, sm] = s.sleep_start.split(":").map(Number);
                        const [eh, em] = s.sleep_end.split(":").map(Number);
                        const mins = eh * 60 + em - (sh * 60 + sm);
                        if (mins <= 0) return null;
                        const h = Math.floor(mins / 60);
                        const m = mins % 60;
                        return h > 0 ? `${h}h ${m}m` : `${m}m`;
                      })()
                    : null;
                  return (
                    <li key={s.id} className="px-4 py-3">
                      <p className="text-sm font-medium text-ink">
                        {formatTimeFromTimeStr(s.sleep_start)}
                        {s.sleep_end
                          ? ` – ${formatTimeFromTimeStr(s.sleep_end)}`
                          : " (still resting)"}
                        {duration && (
                          <span className="ml-2 text-ink/40">({duration})</span>
                        )}
                      </p>
                      {s.notes && (
                        <p className="mt-0.5 text-sm text-ink/60">{s.notes}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Food */}
          {food.length > 0 && (
            <div className={cardClass}>
              <div className="border-b border-coral-light px-4 py-3">
                <h2 className="font-display text-sm font-semibold text-ink">Meals 🍽️</h2>
              </div>
              <ul className="divide-y divide-coral-light">
                {food.map((f) => (
                  <li key={f.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                          {MEAL_LABELS[f.meal_type] ?? f.meal_type}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-ink">{f.food_offered}</p>
                        {f.notes && (
                          <p className="mt-0.5 text-sm text-ink/60">{f.notes}</p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          f.amount_eaten === "all" || f.amount_eaten === "most"
                            ? "bg-sage-light text-sage-dark"
                            : f.amount_eaten === "none"
                            ? "bg-coral-light text-coral-dark"
                            : "bg-ink/5 text-ink/60"
                        }`}
                      >
                        {AMOUNT_LABELS[f.amount_eaten] ?? f.amount_eaten}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Nappy */}
          {nappy.length > 0 && (
            <div className={cardClass}>
              <div className="border-b border-coral-light px-4 py-3">
                <h2 className="font-display text-sm font-semibold text-ink">Nappy Changes 🧷</h2>
              </div>
              <ul className="divide-y divide-coral-light">
                {nappy.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-start justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {formatTimeFromTimeStr(n.changed_at)}
                      </p>
                      {n.notes && (
                        <p className="mt-0.5 text-sm text-ink/60">{n.notes}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-semibold text-ink/60">
                      {NAPPY_LABELS[n.nappy_type] ?? n.nappy_type}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Physical Activity */}
          {physicalActivity.length > 0 && (
            <div className={cardClass}>
              <div className="border-b border-coral-light px-4 py-3">
                <h2 className="font-display text-sm font-semibold text-ink">
                  Physical Activity 🏃
                </h2>
                <p className="mt-0.5 text-xs text-ink/40">
                  {physicalActivity.reduce((s, l) => s + l.duration_minutes, 0)} min total today
                </p>
              </div>
              <ul className="divide-y divide-coral-light">
                {physicalActivity.map((log) => (
                  <li key={log.id} className="px-4 py-3">
                    <p className="text-sm font-medium text-ink">
                      {ACTIVITY_CATEGORY_LABELS[log.activity_category]} · {log.duration_minutes} min
                    </p>
                    {log.movement_skills.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {log.movement_skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-sage-light px-2 py-0.5 text-[10px] font-medium capitalize text-sage-dark"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    {log.notes && (
                      <p className="mt-0.5 text-sm text-ink/60">{log.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Nutrition Education */}
          {nutritionEd.length > 0 && (
            <div className={cardClass}>
              <div className="border-b border-coral-light px-4 py-3">
                <h2 className="font-display text-sm font-semibold text-ink">
                  Nutrition Education 🥦
                </h2>
              </div>
              <ul className="divide-y divide-coral-light">
                {nutritionEd.map((log) => (
                  <li key={log.id} className="px-4 py-3">
                    <p className="text-sm font-medium text-ink">
                      {NUTRITION_TYPE_LABELS[log.activity_type]} · {log.duration_minutes} min
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-ink/70">{log.food_focus}</p>
                    {log.notes && (
                      <p className="mt-0.5 text-sm text-ink/60">{log.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
