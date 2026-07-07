import { createClient } from "@/lib/supabase/server";
import type { ChildProfile, ChildContact, AttendanceRecord } from "@/lib/types/domain";
import type { DailySleep, DailyFood, DailyNappy } from "@/lib/supabase/dailyCare";

export interface ChildDigestData {
  child: ChildProfile;
  parentContacts: ChildContact[];
  attendance: AttendanceRecord | null;
  sleep: DailySleep[];
  food: DailyFood[];
  nappy: DailyNappy[];
  observationNotes: string[];
}

export async function getDigestData(date: string): Promise<ChildDigestData[]> {
  const supabase = await createClient();
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = nextDate.toISOString().slice(0, 10);

  const [
    { data: children },
    { data: allContacts },
    { data: attendance },
    { data: sleep },
    { data: food },
    { data: nappy },
    { data: observations },
  ] = await Promise.all([
    supabase.from("children").select("*").order("first_name"),
    supabase.from("child_contacts").select("*").eq("is_parent_guardian", true),
    supabase.from("attendance_records").select("*").eq("date", date),
    supabase.from("daily_sleep").select("*").eq("date", date).order("sleep_start"),
    supabase.from("daily_food").select("*").eq("date", date).order("created_at"),
    supabase.from("daily_nappy").select("*").eq("date", date).order("changed_at"),
    supabase
      .from("observations")
      .select("id, child_id, note_text")
      .gte("observed_at", `${date}T00:00:00`)
      .lt("observed_at", `${nextDateStr}T00:00:00`),
  ]);

  const childList = children ?? [];

  const contactsByChild = new Map<string, ChildContact[]>();
  for (const c of allContacts ?? []) {
    const arr = contactsByChild.get(c.child_id) ?? [];
    arr.push(c);
    contactsByChild.set(c.child_id, arr);
  }

  const attendanceByChild = new Map((attendance ?? []).map((a) => [a.child_id, a]));

  const sleepByChild = new Map<string, DailySleep[]>();
  for (const s of sleep ?? []) {
    const arr = sleepByChild.get(s.child_id) ?? [];
    arr.push(s);
    sleepByChild.set(s.child_id, arr);
  }

  const foodByChild = new Map<string, DailyFood[]>();
  for (const f of food ?? []) {
    const arr = foodByChild.get(f.child_id) ?? [];
    arr.push(f);
    foodByChild.set(f.child_id, arr);
  }

  const nappyByChild = new Map<string, DailyNappy[]>();
  for (const n of nappy ?? []) {
    const arr = nappyByChild.get(n.child_id) ?? [];
    arr.push(n);
    nappyByChild.set(n.child_id, arr);
  }

  const obsByChild = new Map<string, string[]>();
  for (const o of observations ?? []) {
    const arr = obsByChild.get(o.child_id) ?? [];
    arr.push(o.note_text);
    obsByChild.set(o.child_id, arr);
  }

  return childList
    .filter(
      (child) =>
        attendanceByChild.has(child.id) ||
        (sleepByChild.get(child.id)?.length ?? 0) > 0 ||
        (foodByChild.get(child.id)?.length ?? 0) > 0 ||
        (nappyByChild.get(child.id)?.length ?? 0) > 0 ||
        (obsByChild.get(child.id)?.length ?? 0) > 0,
    )
    .map((child) => ({
      child,
      parentContacts: contactsByChild.get(child.id) ?? [],
      attendance: attendanceByChild.get(child.id) ?? null,
      sleep: sleepByChild.get(child.id) ?? [],
      food: foodByChild.get(child.id) ?? [],
      nappy: nappyByChild.get(child.id) ?? [],
      observationNotes: obsByChild.get(child.id) ?? [],
    }));
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
  all: "all",
  most: "most",
  half: "half",
  little: "a little",
  none: "none",
  na: "N/A",
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
  const m = diff % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function buildDigestText(data: ChildDigestData, date: string): string {
  const name = data.child.first_name;
  const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lines: string[] = [`Hi,\n\nHere's ${name}'s day on ${formattedDate}:\n`];

  if (data.attendance && data.attendance.status !== "absent") {
    lines.push("ATTENDANCE");
    if (data.attendance.signed_in_at) {
      const t = new Date(data.attendance.signed_in_at).toLocaleTimeString("en-AU", {
        hour: "numeric",
        minute: "2-digit",
      });
      const by = data.attendance.signed_in_by ? ` (dropped off by ${data.attendance.signed_in_by})` : "";
      lines.push(`  Arrived: ${t}${by}`);
    }
    if (data.attendance.signed_out_at) {
      const t = new Date(data.attendance.signed_out_at).toLocaleTimeString("en-AU", {
        hour: "numeric",
        minute: "2-digit",
      });
      const by = data.attendance.signed_out_by ? ` (picked up by ${data.attendance.signed_out_by})` : "";
      lines.push(`  Departed: ${t}${by}`);
    } else {
      lines.push("  Still with us");
    }
    lines.push("");
  }

  if (data.sleep.length > 0) {
    lines.push("SLEEP");
    for (const s of data.sleep) {
      const start = formatTime(s.sleep_start);
      const end = s.sleep_end ? formatTime(s.sleep_end) : "still asleep";
      const dur = s.sleep_end ? ` (${formatDuration(s.sleep_start, s.sleep_end)})` : "";
      lines.push(`  ${start} – ${end}${dur}${s.notes ? ` — ${s.notes}` : ""}`);
    }
    lines.push("");
  }

  if (data.food.length > 0) {
    lines.push("MEALS");
    for (const f of data.food) {
      const meal = MEAL_LABELS[f.meal_type] ?? f.meal_type;
      const amt = AMOUNT_LABELS[f.amount_eaten] ?? f.amount_eaten;
      lines.push(`  ${meal}: ${f.food_offered} — ate ${amt}${f.notes ? ` (${f.notes})` : ""}`);
    }
    lines.push("");
  }

  if (data.nappy.length > 0) {
    lines.push("NAPPY CHANGES");
    for (const n of data.nappy) {
      const type = NAPPY_LABELS[n.nappy_type] ?? n.nappy_type;
      lines.push(`  ${formatTime(n.changed_at)}: ${type}${n.notes ? ` — ${n.notes}` : ""}`);
    }
    lines.push("");
  }

  if (data.observationNotes.length > 0) {
    lines.push("LEARNING");
    for (const note of data.observationNotes) {
      lines.push(`  • ${note}`);
    }
    lines.push("");
  }

  lines.push("Have a wonderful evening!");

  return lines.join("\n");
}
