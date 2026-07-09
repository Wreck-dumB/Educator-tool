import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChildren } from "@/lib/supabase/children";
import { cardClass } from "@/lib/ui";

function todayAEST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

function formatTime(t: string | null) {
  if (!t) return "";
  // t is a time string e.g. "09:30:00"
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "pm" : "am";
  const display = hour % 12 || 12;
  return `${display}:${m}${suffix}`;
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

  const [sleepRes, foodRes, nappyRes] = await Promise.all([
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
  ]);

  const sleep = sleepRes.data ?? [];
  const food = foodRes.data ?? [];
  const nappy = nappyRes.data ?? [];
  const hasAny = sleep.length > 0 || food.length > 0 || nappy.length > 0;

  const displayDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Daily Diary</h1>
      <p className="mt-1 text-sm text-ink/60">
        What happened at the service today — meals, sleep, nappy changes.
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

      <p className="mt-4 text-sm font-semibold text-ink/50">{displayDate} · {selectedChild.first_name}</p>

      {!hasAny ? (
        <p className={`mt-4 p-5 text-sm text-ink/50 ${cardClass}`}>
          No diary entries recorded yet for this day. Your educator will update this throughout the day.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">

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
                        const mins = (eh * 60 + em) - (sh * 60 + sm);
                        if (mins <= 0) return null;
                        const h = Math.floor(mins / 60);
                        const m = mins % 60;
                        return h > 0 ? `${h}h ${m}m` : `${m}m`;
                      })()
                    : null;
                  return (
                    <li key={s.id} className="px-4 py-3">
                      <p className="text-sm font-medium text-ink">
                        {formatTime(s.sleep_start)}
                        {s.sleep_end ? ` – ${formatTime(s.sleep_end)}` : " (still resting)"}
                        {duration && <span className="ml-2 text-ink/40">({duration})</span>}
                      </p>
                      {s.notes && <p className="mt-0.5 text-sm text-ink/60">{s.notes}</p>}
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
                        {f.notes && <p className="mt-0.5 text-sm text-ink/60">{f.notes}</p>}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        f.amount_eaten === "all" || f.amount_eaten === "most"
                          ? "bg-sage-light text-sage-dark"
                          : f.amount_eaten === "none"
                          ? "bg-coral-light text-coral-dark"
                          : "bg-ink/5 text-ink/60"
                      }`}>
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
                  <li key={n.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{formatTime(n.changed_at)}</p>
                      {n.notes && <p className="mt-0.5 text-sm text-ink/60">{n.notes}</p>}
                    </div>
                    <span className="shrink-0 rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-semibold text-ink/60">
                      {NAPPY_LABELS[n.nappy_type] ?? n.nappy_type}
                    </span>
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
