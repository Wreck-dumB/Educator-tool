import type { Metadata } from "next";
import { getDigestData, buildDigestText } from "@/lib/supabase/digest";
import { cardClass } from "@/lib/ui";
import CopyButton from "@/components/CopyButton";
import DigestDatePicker from "@/components/DigestDatePicker";
import Link from "next/link";

export const metadata: Metadata = { title: "Daily Digest · SparkPlay" };

function todayLocal() {
  return new Date().toISOString().slice(0, 10);
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅",
  morning_tea: "☕",
  lunch: "🍽️",
  afternoon_tea: "🫖",
  late_snack: "🌙",
  other: "🍴",
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  morning_tea: "Morning tea",
  lunch: "Lunch",
  afternoon_tea: "Afternoon tea",
  late_snack: "Late snack",
  other: "Other",
};

const AMOUNT_LABELS: Record<string, string> = {
  all: "All",
  most: "Most",
  half: "Half",
  little: "A little",
  none: "None",
  na: "N/A",
};

const AMOUNT_COLOURS: Record<string, string> = {
  all: "bg-sage-light text-sage-dark",
  most: "bg-sage-light text-sage-dark",
  half: "bg-amber-light text-amber-dark",
  little: "bg-amber-light text-amber-dark",
  none: "bg-coral-light text-coral-dark",
  na: "bg-ink/5 text-ink/50",
};

const NAPPY_LABELS: Record<string, string> = {
  wet: "Wet",
  dirty: "Dirty",
  both: "Wet & dirty",
  dry: "Dry",
  na: "N/A",
};

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatDuration(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  if (diff <= 0) return "";
  const h = Math.floor(diff / 60);
  const min = diff % 60;
  if (h === 0) return `${min}m`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}m`;
}

export default async function DigestPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam ?? todayLocal();
  const children = await getDigestData(date);

  const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">Daily Digest</h1>
          <p className="mt-1 text-sm text-ink/60">
            A summary of each child&apos;s day — ready to copy and share with families.
          </p>
        </div>
        <DigestDatePicker date={date} />
      </div>

      <p className="mt-4 text-sm font-semibold text-ink/60">{displayDate}</p>

      {children.length === 0 && (
        <div className={`mt-6 p-6 text-center ${cardClass}`}>
          <p className="text-sm text-ink/50">No data recorded for this date.</p>
          <p className="mt-1 text-xs text-ink/40">
            Log attendance, care records, or observations first.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/attendance" className="text-sm font-medium text-coral-dark hover:underline">
              Attendance →
            </Link>
            <Link href="/observations" className="text-sm font-medium text-coral-dark hover:underline">
              Observations →
            </Link>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-5">
        {children.map(({ child, parentContacts, attendance, sleep, food, nappy, observationNotes }) => {
          const digestText = buildDigestText(
            { child, parentContacts, attendance, sleep, food, nappy, observationNotes },
            date,
          );
          const emailContacts = parentContacts.filter((c) => c.email);

          return (
            <div key={child.id} className={cardClass}>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-coral-light px-4 py-3">
                <h2 className="font-display text-base font-semibold text-ink">
                  🧒 {child.first_name}
                </h2>
                {attendance?.status === "absent" ? (
                  <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-semibold text-ink/50">
                    Absent
                  </span>
                ) : attendance?.status === "signed_out" ? (
                  <span className="rounded-full bg-sage-light px-2.5 py-0.5 text-xs font-semibold text-sage-dark">
                    Signed out
                  </span>
                ) : attendance?.status === "signed_in" ? (
                  <span className="rounded-full bg-coral-light px-2.5 py-0.5 text-xs font-semibold text-coral-dark">
                    On premises
                  </span>
                ) : null}
              </div>

              <div className="divide-y divide-coral-light">
                {/* Attendance */}
                {attendance && attendance.status !== "absent" && (
                  <div className="flex items-center gap-6 px-4 py-3 text-sm">
                    <span className="text-ink/40">🕐</span>
                    <div className="flex gap-4 text-ink/70">
                      {attendance.signed_in_at && (
                        <span>
                          In:{" "}
                          <strong className="text-ink">
                            {new Date(attendance.signed_in_at).toLocaleTimeString("en-AU", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </strong>
                          {attendance.signed_in_by && (
                            <span className="text-ink/40"> · {attendance.signed_in_by}</span>
                          )}
                        </span>
                      )}
                      {attendance.signed_out_at ? (
                        <span>
                          Out:{" "}
                          <strong className="text-ink">
                            {new Date(attendance.signed_out_at).toLocaleTimeString("en-AU", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </strong>
                          {attendance.signed_out_by && (
                            <span className="text-ink/40"> · {attendance.signed_out_by}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-ink/40">Still here</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Sleep */}
                {sleep.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
                      😴 Sleep
                    </p>
                    <div className="space-y-1">
                      {sleep.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-ink">
                            {formatTime(s.sleep_start)} – {s.sleep_end ? formatTime(s.sleep_end) : "…"}
                          </span>
                          {s.sleep_end && (
                            <span className="rounded-full bg-sage-light px-2 py-0.5 text-xs text-sage-dark">
                              {formatDuration(s.sleep_start, s.sleep_end)}
                            </span>
                          )}
                          {s.notes && <span className="text-xs text-ink/50">{s.notes}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Food */}
                {food.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
                      🍎 Meals
                    </p>
                    <div className="space-y-1">
                      {food.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 text-sm">
                          <span className="text-ink/50">
                            {MEAL_ICONS[f.meal_type]} {MEAL_LABELS[f.meal_type] ?? f.meal_type}
                          </span>
                          <span className="text-ink/70">{f.food_offered}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${AMOUNT_COLOURS[f.amount_eaten] ?? "bg-ink/5 text-ink/50"}`}
                          >
                            {AMOUNT_LABELS[f.amount_eaten] ?? f.amount_eaten}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nappy */}
                {nappy.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
                      🧷 Nappy changes ({nappy.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {nappy.map((n) => (
                        <span
                          key={n.id}
                          className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs text-ink/70"
                        >
                          {formatTime(n.changed_at)} · {NAPPY_LABELS[n.nappy_type] ?? n.nappy_type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Observations */}
                {observationNotes.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
                      📚 Learning
                    </p>
                    <ul className="space-y-1.5">
                      {observationNotes.map((note, i) => (
                        <li key={i} className="text-sm text-ink/80">
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Send actions */}
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <CopyButton text={digestText} label="Copy digest text" />
                  {emailContacts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {emailContacts.map((c) => {
                        const subject = encodeURIComponent(
                          `${child.first_name}'s day — ${displayDate}`,
                        );
                        const body = encodeURIComponent(digestText);
                        return (
                          <a
                            key={c.id}
                            href={`mailto:${c.email}?subject=${subject}&body=${body}`}
                            className="rounded-full border border-coral-light px-3 py-1.5 text-xs font-semibold text-coral-dark hover:bg-coral-light transition-colors"
                          >
                            Email {c.full_name.split(" ")[0]} ↗
                          </a>
                        );
                      })}
                    </div>
                  )}
                  {emailContacts.length === 0 && (
                    <span className="text-xs text-ink/40">
                      Add a parent contact with an email on the{" "}
                      <Link href={`/children/${child.id}`} className="underline">
                        child&apos;s profile
                      </Link>{" "}
                      to email directly.
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
