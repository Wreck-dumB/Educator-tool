"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChildProfile, AttendanceRecord } from "@/lib/types/domain";
import { signIn, signOut, markAbsent, undoAttendance } from "./actions";

interface Props {
  children: ChildProfile[];
  records: AttendanceRecord[];
  date: string;
}

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

function ChildRow({ child, record, date }: { child: ChildProfile; record: AttendanceRecord | undefined; date: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const status = record?.status ?? "not_marked";

  function run(action: (fd: FormData) => Promise<void>, extra?: Record<string, string>) {
    const fd = new FormData();
    fd.set("child_id", child.id);
    fd.set("date", date);
    if (extra) Object.entries(extra).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      await action(fd);
      router.refresh();
    });
  }

  return (
    <li className={`px-4 py-3 transition-opacity ${pending ? "opacity-40" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Name + status */}
        <div className="min-w-[140px] flex-1">
          <p className="font-medium text-ink">{child.first_name}</p>
          <div className="mt-0.5">
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Times */}
        <div className="flex gap-4 text-xs text-ink/50">
          {record?.signed_in_at && (
            <span title={record.signed_in_by ? `Dropped off by ${record.signed_in_by}` : undefined}>
              In {fmt(record.signed_in_at)}{record.signed_in_by ? ` · ${record.signed_in_by}` : ""}
            </span>
          )}
          {record?.signed_out_at && (
            <span title={record.signed_out_by ? `Picked up by ${record.signed_out_by}` : undefined}>
              Out {fmt(record.signed_out_at)}{record.signed_out_by ? ` · ${record.signed_out_by}` : ""}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {(status === "not_marked" || status === "absent") && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(signIn)}
              className="rounded-full bg-sage px-3 py-1 text-xs font-semibold text-white hover:bg-sage-dark disabled:opacity-50"
            >
              Sign In
            </button>
          )}
          {status === "signed_in" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(signOut)}
              className="rounded-full bg-ink/80 px-3 py-1 text-xs font-semibold text-white hover:bg-ink disabled:opacity-50"
            >
              Sign Out
            </button>
          )}
          {status === "signed_out" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(signIn)}
              className="rounded-full border border-sage px-3 py-1 text-xs font-semibold text-sage-dark hover:bg-sage-light disabled:opacity-50"
            >
              Sign In Again
            </button>
          )}
          {status === "not_marked" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(markAbsent)}
              className="rounded-full border border-coral-light px-3 py-1 text-xs font-semibold text-coral-dark hover:bg-coral-light disabled:opacity-50"
            >
              Absent
            </button>
          )}
          {status !== "not_marked" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(undoAttendance)}
              className="text-xs text-ink/30 hover:text-ink/60 disabled:opacity-50"
            >
              Undo
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function AttendanceRegister({ children, records, date }: Props) {
  const recordMap = new Map(records.map((r) => [r.child_id, r]));

  const onPremises = records.filter((r) => r.status === "signed_in").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const notMarked = children.length - records.length;

  return (
    <div>
      {/* Summary strip */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-sage-light px-4 py-1.5 text-sm font-semibold text-sage-dark">
          <span className="inline-block h-2 w-2 rounded-full bg-sage" />
          {onPremises} on premises
        </div>
        {absent > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-coral-light px-4 py-1.5 text-sm font-semibold text-coral-dark">
            {absent} absent
          </div>
        )}
        {notMarked > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-light px-4 py-1.5 text-sm font-semibold text-amber-dark">
            {notMarked} not yet marked
          </div>
        )}
        <div className="ml-auto flex items-center text-sm font-medium text-ink/40">
          {children.length} enrolled
        </div>
      </div>

      {/* Register list */}
      {children.length === 0 ? (
        <p className="rounded-2xl border border-coral-light bg-white px-5 py-8 text-center text-sm text-ink/50">
          No children enrolled yet —{" "}
          <a href="/children" className="font-medium text-coral-dark hover:underline">
            add children
          </a>{" "}
          to start taking roll.
        </p>
      ) : (
        <ul className="divide-y divide-coral-light rounded-2xl border border-coral-light bg-white">
          {children.map((child) => (
            <ChildRow
              key={child.id}
              child={child}
              record={recordMap.get(child.id)}
              date={date}
            />
          ))}
        </ul>
      )}

      {/* Evacuation list — print only */}
      {onPremises > 0 && (
        <div className="hidden print:block">
          <h2 className="mt-8 text-lg font-bold">Emergency Evacuation Roll — {date}</h2>
          <p className="text-sm text-ink/60">Children currently on premises ({onPremises})</p>
          <ol className="mt-3 space-y-1">
            {records
              .filter((r) => r.status === "signed_in")
              .map((r) => {
                const child = children.find((c) => c.id === r.child_id);
                return (
                  <li key={r.id} className="flex items-center gap-3 text-sm">
                    <span className="inline-block h-4 w-4 rounded border border-ink/40" />
                    {child?.first_name ?? "Unknown"} — in {fmt(r.signed_in_at)}
                  </li>
                );
              })}
          </ol>
        </div>
      )}
    </div>
  );
}
