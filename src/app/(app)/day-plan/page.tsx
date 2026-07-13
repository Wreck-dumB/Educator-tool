import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { cardClass, errorBannerClass, successBannerClass, inputClass } from "@/lib/ui";
import PrintButton from "@/components/PrintButton";
import RoutineEditor from "@/components/RoutineEditor";
import { addProgramEntry } from "./actions";
import type { RoutineBlock } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Day Plan · DR. SparkPlay" };

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function todayLocal() {
  return new Date().toISOString().slice(0, 10);
}

function localDayOfWeek(dateStr: string): number {
  // day_of_week: 0=Mon...6=Sun, matching DB convention
  const d = new Date(dateStr + "T12:00:00");
  return (d.getDay() + 6) % 7; // JS getDay: 0=Sun → shift so 0=Mon
}

const SESSION_LABELS: Record<string, string> = {
  full_day: "Full day",
  morning: "Morning",
  afternoon: "Afternoon",
};

const BLOCK_TYPE_ICONS: Record<string, string> = {
  routine: "📋",
  activity: "🎨",
  meal: "🍎",
  rest: "😴",
  outdoor: "🌳",
  transition: "↔️",
};

const BLOCK_TYPE_COLORS: Record<string, string> = {
  routine: "border-l-ink/30",
  activity: "border-l-sage",
  meal: "border-l-amber-400",
  rest: "border-l-blue-300",
  outdoor: "border-l-green-400",
  transition: "border-l-ink/10",
};

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")}${period}`;
}

export default async function DayPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; error?: string; saved?: string; added?: string }>;
}) {
  const { date: dateParam, error, saved, added } = await searchParams;
  const date = dateParam ?? todayLocal();
  const dayOfWeek = localDayOfWeek(date);
  const dayName = DAY_NAMES[dayOfWeek] ?? "Weekend";
  const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const isWeekend = dayOfWeek >= 5;

  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();

  if (!ownerUserId) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-ink/50">No active service membership.</p>
      </div>
    );
  }

  // Parallel fetches
  const [
    { data: enrolledToday },
    { data: attendance },
    { data: programEntries },
    { data: savedRoutine },
    { data: allChildren },
    { data: followUps },
    { data: savedActivities },
    { data: routineTemplates },
  ] = await Promise.all([
    // Children enrolled for this day of week
    supabase
      .from("child_attendance_days")
      .select("child_id, session_type")
      .eq("owner_user_id", ownerUserId)
      .eq("day_of_week", dayOfWeek),

    // Actual attendance for this date
    supabase
      .from("attendance_records")
      .select("child_id, status, signed_in_at, signed_out_at")
      .eq("date", date),

    // Program entries for this date
    supabase
      .from("program_entries")
      .select("id, title, notes, eylf_codes, activity_id")
      .eq("day_date", date)
      .order("created_at"),

    // Saved routine for this date
    supabase
      .from("daily_routines")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .eq("date", date)
      .maybeSingle(),

    // All children (for cross-reference)
    supabase
      .from("children")
      .select("id, first_name, is_anaphylaxis_risk, medical_conditions, dietary_restrictions")
      .eq("owner_user_id", ownerUserId)
      .order("first_name"),

    // Open follow-ups
    supabase
      .from("child_follow_ups")
      .select("id, child_id, note")
      .eq("owner_user_id", ownerUserId)
      .eq("status", "open"),

    // Saved activities for the "add to today" picker
    supabase
      .from("generated_activities")
      .select("id, title")
      .eq("owner_user_id", ownerUserId)
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(50),

    // Routine templates
    supabase
      .from("daily_routines")
      .select("id, title, blocks")
      .eq("owner_user_id", ownerUserId)
      .eq("is_template", true)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const childMap = new Map((allChildren ?? []).map((c) => [c.id, c]));
  const attendanceMap = new Map((attendance ?? []).map((a) => [a.child_id, a]));
  const followUpsByChild = new Map<string, string[]>();
  for (const f of followUps ?? []) {
    const arr = followUpsByChild.get(f.child_id) ?? [];
    arr.push(f.note);
    followUpsByChild.set(f.child_id, arr);
  }

  // Build roster: enrolled children + unexpected attendees
  type RosterEntry = {
    child: NonNullable<typeof allChildren>[0];
    session_type: string;
    status: "expected" | "present" | "absent" | "unexpected";
    signed_in_at?: string | null;
    signed_out_at?: string | null;
  };

  const enrolledSet = new Set((enrolledToday ?? []).map((e) => e.child_id));
  const roster: RosterEntry[] = [];

  // Enrolled children
  for (const enrolled of enrolledToday ?? []) {
    const child = childMap.get(enrolled.child_id);
    if (!child) continue;
    const att = attendanceMap.get(enrolled.child_id);
    let status: RosterEntry["status"] = "expected";
    if (att?.status === "absent") status = "absent";
    else if (att?.status === "signed_in" || att?.status === "signed_out") status = "present";
    roster.push({ child, session_type: enrolled.session_type, status, signed_in_at: att?.signed_in_at, signed_out_at: att?.signed_out_at });
  }

  // Unexpected attendees (signed in but not enrolled this day)
  for (const att of attendance ?? []) {
    if (enrolledSet.has(att.child_id)) continue;
    if (att.status === "absent") continue;
    const child = childMap.get(att.child_id);
    if (!child) continue;
    roster.push({ child, session_type: "full_day", status: "unexpected", signed_in_at: att.signed_in_at, signed_out_at: att.signed_out_at });
  }

  const presentCount = roster.filter((r) => r.status === "present").length;
  const expectedCount = roster.filter((r) => r.status === "expected").length;
  const absentCount = roster.filter((r) => r.status === "absent").length;

  const plannedActivityTitles = (programEntries ?? []).map((e) => e.title);
  const routineBlocks: RoutineBlock[] = (savedRoutine?.blocks as RoutineBlock[] | null) ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header — screen only */}
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">Day Plan</h1>
          <p className="mt-1 text-sm text-ink/60">{displayDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            defaultValue={date}
            onChange={(e) => {
              if (e.target.value) window.location.href = `/day-plan?date=${e.target.value}`;
            }}
            className="rounded-xl border border-coral-light px-3 py-1.5 text-sm text-ink focus:border-coral focus:outline-none"
          />
          <PrintButton />
        </div>
      </div>

      {error && <p className={errorBannerClass}>{error}</p>}
      {saved && <p className={successBannerClass}>Day plan saved.</p>}
      {added && <p className={successBannerClass}>Activity added to today&apos;s plan.</p>}

      {isWeekend && (
        <div className="mt-4 rounded-xl bg-ink/5 p-4 text-sm text-ink/50 print:hidden">
          Weekend selected — no enrolled children expected. Planning ahead?
        </div>
      )}

      {/* ═══════════════ PRINT HEADER ═══════════════ */}
      <div className="hidden print:block print:mb-6">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <div>
            <h1 className="text-2xl font-bold text-black">Day Plan — {displayDate}</h1>
            {savedRoutine?.focus_topic && (
              <p className="mt-0.5 text-sm font-medium text-black">Focus: {savedRoutine.focus_topic}</p>
            )}
          </div>
          <div className="text-right text-xs text-black/60">
            <p>{presentCount + expectedCount} children expected</p>
            {absentCount > 0 && <p>{absentCount} absent</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 print:grid-cols-1 print:gap-4">
        {/* ═══════════════ ROSTER ═══════════════ */}
        <div className={cardClass}>
          <div className="border-b border-coral-light px-4 py-3 print:border-b-2 print:border-black">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-ink print:text-black">
                Today&apos;s Roster
              </h2>
              <span className="text-xs text-ink/50 print:text-black">
                {presentCount} present · {expectedCount} expected · {absentCount} absent
              </span>
            </div>
          </div>

          {roster.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-ink/50">No children enrolled for {dayName}.</p>
              <Link href="/children" className="mt-2 block text-xs text-coral-dark hover:underline print:hidden">
                Set enrolled days on each child&apos;s profile →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-coral-light">
              {roster.map(({ child, session_type, status, signed_in_at, signed_out_at }) => {
                const hasAlert = child.is_anaphylaxis_risk || child.medical_conditions || child.dietary_restrictions;
                const childFollowUps = followUpsByChild.get(child.id) ?? [];
                return (
                  <li
                    key={child.id}
                    className={`flex items-start gap-3 px-4 py-3 ${status === "absent" ? "opacity-50" : ""}`}
                  >
                    <div
                      className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        status === "present" ? "bg-sage" :
                        status === "absent" ? "bg-coral/40" :
                        status === "unexpected" ? "bg-amber-400" :
                        "bg-ink/20"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-sm font-medium ${status === "absent" ? "line-through text-ink/50" : "text-ink"} print:text-black`}>
                          {child.first_name}
                        </span>
                        {status === "absent" && (
                          <span className="rounded-full bg-coral-light px-2 py-0.5 text-[10px] font-semibold text-coral-dark print:border print:border-black print:bg-white print:text-black">
                            ABSENT
                          </span>
                        )}
                        {status === "unexpected" && (
                          <span className="rounded-full bg-amber-light px-2 py-0.5 text-[10px] font-semibold text-amber-dark">
                            Casual
                          </span>
                        )}
                        {session_type !== "full_day" && (
                          <span className="text-xs text-ink/40 print:text-black">{SESSION_LABELS[session_type]}</span>
                        )}
                        {hasAlert && (
                          <span className="rounded-full bg-coral px-2 py-0.5 text-[10px] font-bold text-white" title={[child.medical_conditions, child.dietary_restrictions].filter(Boolean).join("; ")}>
                            ⚠
                          </span>
                        )}
                      </div>
                      {status === "present" && (
                        <p className="text-[11px] text-ink/40 print:text-black">
                          In {signed_in_at ? new Date(signed_in_at).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }) : "—"}
                          {signed_out_at && ` · Out ${new Date(signed_out_at).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`}
                        </p>
                      )}
                      {/* Health alerts — always visible */}
                      {child.is_anaphylaxis_risk && (
                        <p className="text-[11px] font-semibold text-coral-dark print:text-black">Anaphylaxis risk — EpiPen required</p>
                      )}
                      {child.medical_conditions && (
                        <p className="text-[11px] text-ink/60 print:text-black">{child.medical_conditions}</p>
                      )}
                      {child.dietary_restrictions && (
                        <p className="text-[11px] text-ink/60 print:text-black">Diet: {child.dietary_restrictions}</p>
                      )}
                      {/* Follow-ups for present/expected children */}
                      {status !== "absent" && childFollowUps.length > 0 && (
                        <div className="mt-1 print:hidden">
                          {childFollowUps.map((note, i) => (
                            <p key={i} className="text-[11px] text-sage-dark">→ {note}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Print: general notes */}
          {savedRoutine?.notes && (
            <div className="border-t border-coral-light px-4 py-3 print:border-t-2 print:border-black">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 print:text-black">Notes for staff</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink/80 print:text-black">{savedRoutine.notes}</p>
            </div>
          )}
        </div>

        {/* ═══════════════ PROGRAM / ACTIVITIES ═══════════════ */}
        <div className={cardClass}>
          <div className="border-b border-coral-light px-4 py-3 print:border-b-2 print:border-black">
            <h2 className="font-display font-semibold text-ink print:text-black">Today&apos;s Activities</h2>
          </div>

          {(!programEntries || programEntries.length === 0) ? (
            <div className="px-4 py-4 text-sm text-ink/50">
              No activities planned yet.
            </div>
          ) : (
            <ul className="divide-y divide-coral-light">
              {programEntries.map((e) => (
                <li key={e.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-ink print:text-black">{e.title}</p>
                  {e.notes && <p className="mt-0.5 text-xs text-ink/60 print:text-black">{e.notes}</p>}
                  {e.eylf_codes.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {e.eylf_codes.map((code) => (
                        <span key={code} className="rounded-full bg-sage-light px-2 py-0.5 text-[10px] font-medium text-sage-dark print:border print:border-black print:bg-white print:text-black">
                          EYLF {code}
                        </span>
                      ))}
                    </div>
                  )}
                  {e.activity_id && (
                    <Link href={`/activities/${e.activity_id}`} className="mt-1 block text-xs text-coral-dark hover:underline print:hidden">
                      View full activity →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Add activity to today — screen only */}
          <details className="border-t border-coral-light print:hidden">
            <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-coral-dark">
              + Add activity to today
            </summary>
            <form action={addProgramEntry} className="space-y-2 px-4 pb-4">
              <input type="hidden" name="day_date" value={date} />
              <div>
                <label className="mb-1 block text-xs text-ink/60">From saved activities</label>
                <select name="activity_id" className={inputClass} onChange={(e) => {
                  const opt = e.target.options[e.target.selectedIndex];
                  const titleInput = e.target.closest("form")?.querySelector<HTMLInputElement>('[name="title"]');
                  if (titleInput && opt.text !== "— or type below —") titleInput.value = opt.text;
                }}>
                  <option value="">Select a saved activity (optional)…</option>
                  {(savedActivities ?? []).map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink/60">Or type a title</label>
                <input type="text" name="title" placeholder="Activity title…" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink/60">Notes (optional)</label>
                <input type="text" name="notes" placeholder="e.g. Set up in art corner" className={inputClass} />
              </div>
              <input type="hidden" name="eylf_codes" value="[]" />
              <button type="submit" className="rounded-full bg-coral-light px-4 py-1.5 text-xs font-semibold text-coral-dark hover:bg-coral/20">
                Add to today
              </button>
            </form>
          </details>
        </div>
      </div>

      {/* ═══════════════ DAILY ROUTINE ═══════════════ */}
      <div className={`mt-6 ${cardClass}`}>
        {/* Print view of routine blocks */}
        {routineBlocks.length > 0 && (
          <div className="px-4 py-3">
            <div className="border-b border-coral-light pb-2 print:border-b-2 print:border-black">
              <h2 className="font-display font-semibold text-ink print:text-black">Daily Routine</h2>
              {savedRoutine?.focus_topic && (
                <p className="text-xs text-ink/50 print:text-black">Focus: {savedRoutine.focus_topic}</p>
              )}
            </div>
            <div className="mt-3 space-y-1 print:space-y-0.5">
              {routineBlocks.map((b, i) => (
                <div key={i} className={`flex gap-3 border-l-4 py-2 pl-3 print:py-1 ${BLOCK_TYPE_COLORS[b.type] ?? "border-l-ink/20"}`}>
                  <span className="w-16 shrink-0 font-mono text-sm font-semibold text-ink/70 print:text-black">
                    {formatTime(b.time)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink print:text-black">
                        {BLOCK_TYPE_ICONS[b.type]} {b.title}
                      </span>
                      <span className="text-xs text-ink/40 print:text-black">{b.duration_minutes}min</span>
                    </div>
                    {b.notes && <p className="text-xs text-ink/60 print:text-black">{b.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Routine editor — screen only */}
        <details className="print:hidden">
          <summary className={`cursor-pointer border-t border-coral-light px-4 py-3 text-sm font-semibold text-ink ${routineBlocks.length > 0 ? "" : "border-t-0"}`}>
            {routineBlocks.length > 0 ? "Edit routine" : "Build a daily routine"}
            {routineBlocks.length === 0 && <span className="ml-2 text-xs font-normal text-ink/40">— editable, printable, saveable</span>}
          </summary>
          <div className="border-t border-coral-light px-4 pb-6 pt-4">
            {routineTemplates && routineTemplates.length > 0 && (
              <div className="mb-4">
                <p className="mb-1.5 text-xs font-medium text-ink/60">Start from a template:</p>
                <div className="flex flex-wrap gap-2">
                  {routineTemplates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="rounded-full border border-sage-light px-3 py-1.5 text-xs font-medium text-sage-dark hover:bg-sage-light"
                      onClick={() => {
                        const event = new CustomEvent("load-template", { detail: t.blocks });
                        window.dispatchEvent(event);
                      }}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <RoutineEditor
              initialBlocks={routineBlocks}
              date={date}
              existingId={savedRoutine?.id}
              existingTitle={savedRoutine?.title}
              focusTopic={savedRoutine?.focus_topic ?? undefined}
              notes={savedRoutine?.notes ?? undefined}
              childCount={presentCount + expectedCount}
              dayName={dayName}
              plannedActivities={plannedActivityTitles}
            />
          </div>
        </details>
      </div>

      {/* ═══════════════ PRINT FOOTER ═══════════════ */}
      <div className="mt-6 hidden border-t border-black pt-3 print:block">
        <div className="flex justify-between text-xs text-black/50">
          <span>DR. SparkPlay Day Plan — {displayDate}</span>
          <span>Printed: {new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}</span>
        </div>
      </div>
    </div>
  );
}
