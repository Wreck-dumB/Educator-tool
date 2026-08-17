import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getMyStaffRole, getMyService, getStaffMembers } from "@/lib/supabase/staff";
import { addLeave, deleteLeave } from "./actions";
import AnnualLeaveCalendarDownload from "./AnnualLeaveCalendarDownload";
import { cardClass, inputClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "AL",
  sick: "SL",
  public_holiday: "PH",
  other: "O",
};

function monthOf(offset = 0): { year: number; month: number } {
  const now = new Date();
  const total = now.getFullYear() * 12 + now.getMonth() + offset;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function LeaveCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; month?: string }>;
}) {
  const { error, month } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/onboarding");

  const myRole = await getMyStaffRole();
  const canEdit = myRole === "director" || myRole === "2ic";

  const monthOffset = month ? parseInt(month, 10) : 0;
  const { year, month: monthIndex } = monthOf(monthOffset);

  const service = await getMyService();
  const staffMembers = service ? await getStaffMembers(service.id) : [];
  const activeStaff = staffMembers.filter((m) => m.status === "active");
  const staffById = new Map(activeStaff.map((s) => [s.user_id, s.displayName]));

  const monthStartStr = new Date(year, monthIndex, 1).toLocaleDateString("en-CA");
  const monthEndStr = new Date(year, monthIndex + 1, 0).toLocaleDateString("en-CA");

  const { data: monthLeave } = await supabase
    .from("staff_leave")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .gte("leave_date", monthStartStr)
    .lte("leave_date", monthEndStr)
    .order("leave_date");

  const { data: yearLeave } = await supabase
    .from("staff_leave")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .gte("leave_date", `${year}-01-01`)
    .lte("leave_date", `${year}-12-31`);

  const leaveByDate = new Map<string, typeof monthLeave>();
  for (const row of monthLeave ?? []) {
    const list = leaveByDate.get(row.leave_date) ?? [];
    list.push(row);
    leaveByDate.set(row.leave_date, list);
  }

  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // 0 = Monday
  const totalCells = startOffset + daysInMonth;
  const weeks = Math.ceil(totalCells / 7);
  const monthName = firstOfMonth.toLocaleDateString("en-AU", { month: "long", year: "numeric" });

  const flatYearLeave = (yearLeave ?? []).map((row) => ({
    date: row.leave_date as string,
    initials: initialsOf(staffById.get(row.staff_user_id) ?? "?"),
    leaveType: row.leave_type as string,
  }));
  const legend = activeStaff.map((s) => ({ initials: initialsOf(s.displayName), name: s.displayName }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Annual Leave Calendar</h1>
          <p className="mt-1 text-sm text-ink/50">Track staff leave and print a copy for the centre.</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/staff/roster/leave?month=${monthOffset - 1}`}
            className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm hover:bg-ink/5"
          >
            ← Prev
          </a>
          <a
            href="/staff/roster/leave"
            className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm hover:bg-ink/5"
          >
            Today
          </a>
          <a
            href={`/staff/roster/leave?month=${monthOffset + 1}`}
            className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm hover:bg-ink/5"
          >
            Next →
          </a>
        </div>
      </div>

      <div className={cardClass + " p-4"}>
        <AnnualLeaveCalendarDownload year={year} leaveEntries={flatYearLeave} legend={legend} />
      </div>

      {/* Month grid */}
      <div className={cardClass + " p-4 overflow-x-auto"}>
        <p className="text-xs text-ink/40 mb-3">{monthName}</p>
        <div className="grid grid-cols-7 gap-1 min-w-[560px]">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-[10px] font-bold uppercase tracking-wide text-ink/40 px-1">
              {label}
            </div>
          ))}
          {Array.from({ length: weeks * 7 }, (_, i) => {
            const dayNum = i - startOffset + 1;
            const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
            if (!inMonth) return <div key={i} className="rounded-xl bg-ink/[0.03] min-h-[90px]" />;
            const dateStr = new Date(year, monthIndex, dayNum).toLocaleDateString("en-CA");
            const today = new Date().toLocaleDateString("en-CA");
            const isToday = dateStr === today;
            const entries = leaveByDate.get(dateStr) ?? [];
            return (
              <div
                key={i}
                className={`rounded-xl p-2 min-h-[90px] ${isToday ? "bg-coral-light/40 border border-coral/30" : "bg-ink/5"}`}
              >
                <p className={`text-[10px] font-bold mb-1 ${isToday ? "text-coral-dark" : "text-ink/40"}`}>{dayNum}</p>
                <ul className="space-y-1">
                  {entries.map((e) => (
                    <li key={e.id} className="rounded-lg bg-white px-1.5 py-1 text-[10px] leading-tight">
                      <p className="font-semibold text-ink truncate">
                        {initialsOf(staffById.get(e.staff_user_id) ?? "?")} · {LEAVE_TYPE_LABELS[e.leave_type] ?? "O"}
                      </p>
                      {canEdit && (
                        <form action={async () => { "use server"; await deleteLeave(e.id); }}>
                          <button type="submit" className="text-coral-dark hover:underline">✕</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add leave form */}
      {canEdit && (
        <div className={cardClass + " p-5"}>
          <h2 className="font-display text-base font-semibold text-ink mb-4">Add leave</h2>
          {error && <p className={`mb-3 ${errorBannerClass}`}>{error}</p>}
          <form action={async (fd: FormData) => { "use server"; await addLeave(fd); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-ink/70 mb-1">Staff member</label>
                <select name="staff_user_id" required className={inputClass}>
                  <option value="">Select staff…</option>
                  {activeStaff.map((s) => (
                    <option key={s.user_id} value={s.user_id}>{s.displayName} ({s.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">Start date</label>
                <input type="date" name="start_date" required className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">End date (optional)</label>
                <input type="date" name="end_date" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">Type</label>
                <select name="leave_type" className={inputClass} defaultValue="annual">
                  <option value="annual">Annual leave</option>
                  <option value="sick">Sick leave</option>
                  <option value="public_holiday">Public holiday</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">Notes (optional)</label>
                <input type="text" name="notes" placeholder="e.g. Approved by director" className={inputClass} />
              </div>
            </div>
            <button type="submit" className={primaryButtonClass}>Add leave</button>
          </form>
        </div>
      )}
    </div>
  );
}
