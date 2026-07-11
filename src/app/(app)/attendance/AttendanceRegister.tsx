"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChildProfile, AttendanceRecord, Room, RoomStaffCount } from "@/lib/types/domain";
import { signIn, signOut, markAbsent, undoAttendance, updateRoomStaffCount, updateWellbeing } from "./actions";

// ─── Australian NQF educator-to-child ratios ─────────────────────────────────
// NSW and WA use 1:10 for 3–6yo instead of the national 1:11.
const BASE_RATIO_TIERS = [
  { maxMonths: 24,       label: "Under 2",    ratio: 4  },
  { maxMonths: 36,       label: "2–3 years",  ratio: 5  },
  { maxMonths: 72,       label: "3–6 years",  ratio: 11 },
  { maxMonths: Infinity, label: "School age", ratio: 15 },
];

function getRatioTiers(jurisdiction: string) {
  if (jurisdiction === "nsw" || jurisdiction === "wa") {
    return BASE_RATIO_TIERS.map((t) => t.maxMonths === 72 ? { ...t, ratio: 10 } : t);
  }
  return BASE_RATIO_TIERS;
}

function ageMonths(dob: string | null): number | null {
  if (!dob) return null;
  const today = new Date();
  const b = new Date(dob);
  return (today.getFullYear() - b.getFullYear()) * 12 + (today.getMonth() - b.getMonth());
}

/** Sum required educator fractions per child, rounded up to whole number. */
function calcRequired(children: ChildProfile[], tiers: typeof BASE_RATIO_TIERS): {
  required: number;
  breakdown: { label: string; count: number; ratio: number }[];
  hasUnknownAge: boolean;
} {
  const groups = new Map<string, { count: number; ratio: number; perChild: number }>();
  let hasUnknownAge = false;
  let total = 0;

  for (const child of children) {
    const months = ageMonths(child.date_of_birth);
    if (months === null) hasUnknownAge = true;
    const tier = months === null ? tiers[0] : (tiers.find((t) => months < t.maxMonths) ?? tiers[tiers.length - 1]);
    const perChild = 1 / tier.ratio;
    total += perChild;
    const existing = groups.get(tier.label);
    if (existing) existing.count++;
    else groups.set(tier.label, { count: 1, ratio: tier.ratio, perChild });
  }

  return {
    required: children.length === 0 ? 0 : Math.ceil(total),
    breakdown: [...groups.entries()].map(([label, g]) => ({ label, count: g.count, ratio: g.ratio })),
    hasUnknownAge,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(ts: string | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function StatusBadge({ status }: { status: "not_marked" | "absent" | "signed_in" | "signed_out" }) {
  if (status === "signed_in")
    return <span className="inline-flex items-center gap-1 rounded-full bg-sage-light px-2.5 py-0.5 text-xs font-semibold text-sage-dark">● On premises</span>;
  if (status === "signed_out")
    return <span className="inline-flex items-center gap-1 rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-semibold text-ink/50">○ Signed out</span>;
  if (status === "absent")
    return <span className="inline-flex items-center gap-1 rounded-full bg-coral-light px-2.5 py-0.5 text-xs font-semibold text-coral-dark">✕ Absent</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-light px-2.5 py-0.5 text-xs font-semibold text-amber-dark">– Not marked</span>;
}

const WELLBEING_EMOJIS = ["😢", "😟", "😐", "😊", "😄"];

// ─── Individual child row ─────────────────────────────────────────────────────
function ChildRow({
  child, record, date, ratioTiers,
}: {
  child: ChildProfile;
  record: AttendanceRecord | undefined;
  date: string;
  ratioTiers: typeof BASE_RATIO_TIERS;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const status = record?.status ?? "not_marked";

  function run(action: (fd: FormData) => Promise<void>) {
    const fd = new FormData();
    fd.set("child_id", child.id);
    fd.set("date", date);
    startTransition(async () => { await action(fd); router.refresh(); });
  }

  const months = ageMonths(child.date_of_birth);
  const tier = months === null ? ratioTiers[0] : (ratioTiers.find((t) => months < t.maxMonths) ?? ratioTiers[ratioTiers.length - 1]);

  return (
    <li className={`px-4 py-2.5 transition-opacity ${pending ? "opacity-40" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="min-w-[130px] flex-1">
          <p className="text-sm font-medium text-ink">{child.first_name}</p>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-[10px] text-ink/30">{tier.label} · 1:{tier.ratio}</span>
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex gap-4 text-xs text-ink/40">
            {record?.signed_in_at && (
              <span>In {fmt(record.signed_in_at)}{record.signed_in_by ? ` · ${record.signed_in_by}` : ""}</span>
            )}
            {record?.signed_out_at && (
              <span>Out {fmt(record.signed_out_at)}{record.signed_out_by ? ` · ${record.signed_out_by}` : ""}</span>
            )}
          </div>
          {status === "signed_in" && (
            <div className="flex items-center gap-1">
              {WELLBEING_EMOJIS.map((emoji, i) => {
                const level = i + 1;
                const selected = record?.wellbeing_level === level;
                return (
                  <button
                    key={level}
                    type="button"
                    title={`Wellbeing: ${level}/5`}
                    disabled={pending}
                    onClick={() => {
                      const fd = new FormData();
                      fd.set("child_id", child.id);
                      fd.set("date", date);
                      fd.set("wellbeing_level", String(level));
                      startTransition(async () => { await updateWellbeing(fd); router.refresh(); });
                    }}
                    className={`text-base transition-opacity hover:opacity-100 ${selected ? "opacity-100 scale-110" : "opacity-30"}`}
                  >
                    {emoji}
                  </button>
                );
              })}
              {record?.wellbeing_note && (
                <span className="ml-1 text-xs text-ink/40 italic">{record.wellbeing_note}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {(status === "not_marked" || status === "absent") && (
            <button type="button" disabled={pending} onClick={() => run(signIn)}
              className="rounded-full bg-sage px-3 py-1 text-xs font-semibold text-white hover:bg-sage-dark disabled:opacity-50">
              Sign In
            </button>
          )}
          {status === "signed_in" && (
            <button type="button" disabled={pending} onClick={() => run(signOut)}
              className="rounded-full bg-ink/80 px-3 py-1 text-xs font-semibold text-white hover:bg-ink disabled:opacity-50">
              Sign Out
            </button>
          )}
          {status === "signed_out" && (
            <button type="button" disabled={pending} onClick={() => run(signIn)}
              className="rounded-full border border-sage px-3 py-1 text-xs font-semibold text-sage-dark hover:bg-sage-light disabled:opacity-50">
              Sign In Again
            </button>
          )}
          {status === "not_marked" && (
            <button type="button" disabled={pending} onClick={() => run(markAbsent)}
              className="rounded-full border border-coral-light px-3 py-1 text-xs font-semibold text-coral-dark hover:bg-coral-light disabled:opacity-50">
              Absent
            </button>
          )}
          {status !== "not_marked" && (
            <button type="button" disabled={pending} onClick={() => run(undoAttendance)}
              className="text-xs text-ink/30 hover:text-ink/60 disabled:opacity-50">
              Undo
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

// ─── Room section ─────────────────────────────────────────────────────────────
function RoomSection({
  title,
  children,
  records,
  date,
  staffCount,
  roomId,
  ratioTiers,
}: {
  title: string;
  children: ChildProfile[];
  records: AttendanceRecord[];
  date: string;
  staffCount: number;
  roomId: string | null;
  ratioTiers: typeof BASE_RATIO_TIERS;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const recordMap = new Map(records.map((r) => [r.child_id, r]));
  const signedIn = children.filter((c) => recordMap.get(c.id)?.status === "signed_in");
  const absent = children.filter((c) => recordMap.get(c.id)?.status === "absent");
  const notMarked = children.filter((c) => !recordMap.has(c.id));

  const { required, breakdown, hasUnknownAge } = calcRequired(signedIn, ratioTiers);

  const atRatio = staffCount >= required;
  const noChildren = signedIn.length === 0;

  function adjustStaff(delta: number) {
    if (!roomId) return;
    const fd = new FormData();
    fd.set("room_id", roomId);
    fd.set("date", date);
    fd.set("delta", String(delta));
    startTransition(async () => { await updateRoomStaffCount(fd); router.refresh(); });
  }

  const ratioColor = noChildren
    ? "border-ink/10 bg-white"
    : atRatio
      ? "border-sage/30 bg-sage-light/20"
      : "border-coral/40 bg-coral-light/30";

  return (
    <div className={`rounded-2xl border-2 ${ratioColor} overflow-hidden`}>
      {/* Room header */}
      <div className="px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-y-2">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
            <p className="mt-0.5 text-xs text-ink/50">
              {signedIn.length} on premises
              {absent.length > 0 && ` · ${absent.length} absent`}
              {notMarked.length > 0 && ` · ${notMarked.length} not marked`}
            </p>
          </div>

          {/* Ratio block */}
          <div className="flex items-center gap-3">
            {roomId && (
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-xs font-medium text-ink/50">Staff:</span>
                <button
                  type="button"
                  disabled={pending || staffCount <= 0}
                  onClick={() => adjustStaff(-1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-ink/20 text-sm font-bold text-ink/60 hover:bg-ink/5 disabled:opacity-30"
                  aria-label="Remove staff"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm font-bold text-ink">{staffCount}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => adjustStaff(1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-ink/20 text-sm font-bold text-ink/60 hover:bg-ink/5 disabled:opacity-30"
                  aria-label="Add staff"
                >
                  +
                </button>
              </div>
            )}

            <div className={`rounded-xl px-3 py-1.5 text-center text-xs font-semibold ${
              noChildren
                ? "bg-ink/5 text-ink/40"
                : atRatio
                  ? "bg-sage text-white"
                  : "bg-coral text-white"
            }`}>
              {noChildren ? (
                "No children in"
              ) : (
                <>
                  Need {required} educator{required !== 1 ? "s" : ""}
                  <br />
                  <span className="font-normal opacity-80">
                    {atRatio ? "✓ In ratio" : "⚠ Under ratio"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Age breakdown */}
        {breakdown.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
            {breakdown.map((b) => (
              <span key={b.label} className="text-[10px] text-ink/40">
                {b.count} × {b.label} (1:{b.ratio})
              </span>
            ))}
            {hasUnknownAge && (
              <span className="text-[10px] text-coral-dark">⚠ some children missing date of birth — using strictest ratio</span>
            )}
          </div>
        )}
      </div>

      {/* Children list */}
      {children.length > 0 && (
        <ul className="divide-y divide-ink/5 border-t border-ink/5 bg-white/70">
          {children.map((child) => (
            <ChildRow
              key={child.id}
              child={child}
              record={recordMap.get(child.id)}
              date={date}
              ratioTiers={ratioTiers}
            />
          ))}
        </ul>
      )}

      {children.length === 0 && (
        <p className="border-t border-ink/5 px-4 py-3 text-xs text-ink/40">
          No children assigned —{" "}
          <a href="/rooms" className="font-medium text-coral-dark hover:underline">manage rooms</a>
        </p>
      )}
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
interface Props {
  children: ChildProfile[];
  records: AttendanceRecord[];
  rooms: Room[];
  staffCounts: RoomStaffCount[];
  date: string;
  jurisdiction?: string;
}

export default function AttendanceRegister({ children, records, rooms, staffCounts, date, jurisdiction = "national" }: Props) {
  const RATIO_TIERS = getRatioTiers(jurisdiction);
  const recordMap = new Map(records.map((r) => [r.child_id, r]));
  const staffMap = new Map(staffCounts.map((s) => [s.room_id, s.staff_count]));

  // Separate children into room groups
  const byRoom = new Map<string, ChildProfile[]>();
  const unassigned: ChildProfile[] = [];
  for (const room of rooms) byRoom.set(room.id, []);
  for (const child of children) {
    if (child.room_id && byRoom.has(child.room_id)) {
      byRoom.get(child.room_id)!.push(child);
    } else {
      unassigned.push(child);
    }
  }

  const totalOnPremises = records.filter((r) => r.status === "signed_in").length;
  const totalAbsent = records.filter((r) => r.status === "absent").length;
  const totalNotMarked = children.length - records.length;

  return (
    <div>
      {/* Service-wide summary */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-sage-light px-4 py-1.5 text-sm font-semibold text-sage-dark">
          <span className="inline-block h-2 w-2 rounded-full bg-sage" />
          {totalOnPremises} on premises
        </span>
        {totalAbsent > 0 && (
          <span className="rounded-full bg-coral-light px-4 py-1.5 text-sm font-semibold text-coral-dark">
            {totalAbsent} absent
          </span>
        )}
        {totalNotMarked > 0 && (
          <span className="rounded-full bg-amber-light px-4 py-1.5 text-sm font-semibold text-amber-dark">
            {totalNotMarked} not marked
          </span>
        )}
        <span className="ml-auto text-sm font-medium text-ink/40">{children.length} enrolled</span>
      </div>

      {/* No children at all */}
      {children.length === 0 && (
        <p className="rounded-2xl border border-coral-light bg-white px-5 py-8 text-center text-sm text-ink/50">
          No children enrolled yet —{" "}
          <a href="/children" className="font-medium text-coral-dark hover:underline">add children</a>
        </p>
      )}

      {/* No rooms: flat list */}
      {rooms.length === 0 && children.length > 0 && (
        <div>
          <p className="mb-3 rounded-xl border border-amber-light bg-amber-light/40 px-4 py-2 text-xs font-medium text-amber-dark">
            No rooms set up yet —{" "}
            <a href="/rooms" className="underline">create rooms</a>{" "}
            to group children, check ratios, and track staff per room.
          </p>
          <ul className="divide-y divide-coral-light rounded-2xl border border-coral-light bg-white">
            {children.map((child) => (
              <ChildRow key={child.id} child={child} record={recordMap.get(child.id)} date={date} ratioTiers={RATIO_TIERS} />
            ))}
          </ul>
        </div>
      )}

      {/* Rooms view */}
      {rooms.length > 0 && (
        <div className="space-y-4">
          {rooms.map((room) => (
            <RoomSection
              key={room.id}
              title={room.name}
              children={byRoom.get(room.id) ?? []}
              records={records.filter((r) => (byRoom.get(room.id) ?? []).some((c) => c.id === r.child_id))}
              date={date}
              staffCount={staffMap.get(room.id) ?? 0}
              roomId={room.id}
              ratioTiers={RATIO_TIERS}
            />
          ))}

          {unassigned.length > 0 && (
            <RoomSection
              title="Unassigned"
              children={unassigned}
              records={records.filter((r) => unassigned.some((c) => c.id === r.child_id))}
              date={date}
              staffCount={0}
              roomId={null}
              ratioTiers={RATIO_TIERS}
            />
          )}
        </div>
      )}

      {/* Print-only evacuation list */}
      {totalOnPremises > 0 && (
        <div className="hidden print:block">
          <h2 className="mt-8 text-lg font-bold">Emergency Evacuation Roll — {date}</h2>
          <p className="text-sm text-ink/60">Children currently on premises ({totalOnPremises})</p>
          {rooms.map((room) => {
            const roomChildren = byRoom.get(room.id) ?? [];
            const signedInHere = roomChildren.filter((c) => recordMap.get(c.id)?.status === "signed_in");
            if (signedInHere.length === 0) return null;
            return (
              <div key={room.id} className="mt-4">
                <h3 className="text-sm font-bold">{room.name}</h3>
                <ol className="mt-1 space-y-1">
                  {signedInHere.map((c) => {
                    const r = recordMap.get(c.id);
                    return (
                      <li key={c.id} className="flex items-center gap-3 text-sm">
                        <span className="inline-block h-4 w-4 rounded border border-ink/40" />
                        {c.first_name} — in {fmt(r?.signed_in_at ?? null)}
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
          {unassigned.filter((c) => recordMap.get(c.id)?.status === "signed_in").length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-bold">Unassigned</h3>
              <ol className="mt-1 space-y-1">
                {unassigned.filter((c) => recordMap.get(c.id)?.status === "signed_in").map((c) => {
                  const r = recordMap.get(c.id);
                  return (
                    <li key={c.id} className="flex items-center gap-3 text-sm">
                      <span className="inline-block h-4 w-4 rounded border border-ink/40" />
                      {c.first_name} — in {fmt(r?.signed_in_at ?? null)}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
