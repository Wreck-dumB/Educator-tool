import type { Metadata } from "next";
import { getChildren } from "@/lib/supabase/children";
import { getAttendanceForDate } from "@/lib/supabase/attendance";
import { getRooms, getRoomStaffCountsForDate } from "@/lib/supabase/rooms";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { createClient } from "@/lib/supabase/server";
import { cardClass } from "@/lib/ui";
import AttendanceRegister from "./AttendanceRegister";

export const metadata: Metadata = { title: "Roll Call · DR. SparkPlay" };

interface Props {
  searchParams: Promise<{ date?: string }>;
}

function todayLocal(): string {
  // AEST/AEDT: use the server's local date as a sensible default.
  // In production on Vercel (UTC) this won't match the educator's local date,
  // so we default to today UTC and let the date input correct it.
  return new Date().toISOString().slice(0, 10);
}

export default async function AttendancePage({ searchParams }: Props) {
  const { date: rawDate } = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "") ? rawDate! : todayLocal();

  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  const [children, records, rooms, staffCounts, serviceRow] = await Promise.all([
    getChildren(),
    getAttendanceForDate(date),
    getRooms(),
    getRoomStaffCountsForDate(date),
    ownerUserId
      ? supabase.from("services").select("jurisdiction").eq("director_user_id", ownerUserId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const jurisdiction = (serviceRow as { data: { jurisdiction: string | null } | null })?.data?.jurisdiction ?? "national";

  const isToday = date === todayLocal();

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">Roll Call</h1>
          <p className="mt-1 text-sm text-ink/60">
            Daily sign-in / sign-out register — who is on premises right now
          </p>
        </div>
        <button
          type="button"
          onClick={() => {}}
          className="hidden print:hidden rounded-full border border-ink/20 px-4 py-1.5 text-sm font-medium text-ink/60 hover:bg-ink/5 print:block"
          aria-hidden
        />
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full border border-ink/20 px-4 py-1.5 text-sm font-medium text-ink/60 hover:bg-ink/5 print:hidden"
          suppressHydrationWarning
        >
          🖨 Print evacuation list
        </button>
      </div>

      {/* Date picker */}
      <div className={`mt-5 flex items-center gap-3 p-4 ${cardClass} print:hidden`}>
        <label htmlFor="roll-date" className="text-sm font-medium text-ink/70 shrink-0">
          Date
        </label>
        <form className="flex flex-1 items-center gap-2">
          <input
            id="roll-date"
            name="date"
            type="date"
            defaultValue={date}
            className="flex-1 rounded-xl border border-coral-light bg-white px-3 py-1.5 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          />
          <button
            type="submit"
            className="rounded-full bg-coral px-4 py-1.5 text-sm font-semibold text-white hover:bg-coral-dark"
          >
            Go
          </button>
        </form>
        {isToday && (
          <span className="shrink-0 rounded-full bg-sage-light px-2.5 py-0.5 text-xs font-semibold text-sage-dark">
            Today
          </span>
        )}
      </div>

      {/* Print header (hidden on screen) */}
      <div className="hidden print:block mt-4">
        <p className="text-sm text-ink/60">Date: {date}</p>
      </div>

      {/* Register */}
      <div className="mt-4">
        <AttendanceRegister children={children} records={records} rooms={rooms} staffCounts={staffCounts} date={date} jurisdiction={jurisdiction} />
      </div>

      <p className="mt-6 text-xs text-ink/30 print:hidden">
        Tip: click <strong>Sign In</strong> as each child arrives, <strong>Sign Out</strong> when they leave.
        Use <strong>Print evacuation list</strong> for drills — it shows only children currently on premises.
      </p>
    </div>
  );
}
