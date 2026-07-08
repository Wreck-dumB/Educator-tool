"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ChildSignInRow, StaffSignInRow, VisitorSignInRow } from "@/lib/supabase/signinBoard";
import {
  signInChild,
  signOutChild,
  signInStaff,
  signOutStaff,
  addVisitor,
  signOutVisitor,
} from "./actions";

type Tab = "children" | "staff" | "visitors";

function formatTime(ts: string | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  });
}

interface ChildCardProps {
  child: ChildSignInRow;
  currentUserId: string;
}

function ChildCard({ child }: ChildCardProps) {
  const [pending, startTransition] = useTransition();
  const signedIn = child.attendance_status === "signed_in";
  const absent = child.attendance_status === "absent";

  function handleTap() {
    if (absent) return;
    startTransition(async () => {
      if (signedIn) {
        await signOutChild(child.id);
      } else {
        await signInChild(child.id);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleTap}
      disabled={pending || absent}
      className={`flex min-h-[88px] w-full flex-col items-start justify-between rounded-2xl border-2 px-4 py-3 text-left transition-all active:scale-95 disabled:cursor-default ${
        absent
          ? "border-ink/10 bg-ink/5 opacity-50"
          : signedIn
          ? "border-sage bg-sage-light hover:bg-sage-light/70"
          : "border-coral-light bg-white hover:bg-coral-light/40"
      } ${pending ? "opacity-60" : ""}`}
    >
      <span className="font-display text-base font-semibold text-ink leading-tight">
        {child.first_name}
      </span>
      {signedIn && (
        <span className="mt-1 text-xs font-medium text-sage-dark">
          IN {formatTime(child.signed_in_at)}
        </span>
      )}
      {child.attendance_status === "signed_out" && (
        <span className="mt-1 text-xs text-ink/40">
          Was here · tap to re-sign in
        </span>
      )}
      {!child.attendance_status && !absent && (
        <span className="mt-1 text-xs text-ink/40">Tap to sign in</span>
      )}
      {absent && <span className="mt-1 text-xs text-ink/40">Marked absent</span>}
      <span
        className={`mt-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
          absent
            ? "bg-ink/10 text-ink/40"
            : signedIn
            ? "bg-sage text-white"
            : "bg-coral-light text-coral-dark"
        }`}
      >
        {absent ? "Absent" : signedIn ? "Sign Out" : "Sign In"}
      </span>
    </button>
  );
}

interface StaffCardProps {
  staff: StaffSignInRow;
  currentUserId: string;
}

function StaffCard({ staff, currentUserId }: StaffCardProps) {
  const [pending, startTransition] = useTransition();
  const signedIn = !!staff.signed_in_at && !staff.signed_out_at;
  const signedOut = !!staff.signed_out_at;
  const isMe = staff.user_id === currentUserId;

  function handleTap() {
    startTransition(async () => {
      if (signedIn) {
        await signOutStaff(staff.user_id);
      } else {
        await signInStaff();
      }
    });
  }

  const canTap = isMe || signedIn;

  return (
    <button
      type="button"
      onClick={handleTap}
      disabled={pending || !canTap}
      className={`flex min-h-[88px] w-full flex-col items-start justify-between rounded-2xl border-2 px-4 py-3 text-left transition-all active:scale-95 disabled:opacity-40 ${
        signedIn
          ? "border-sage bg-sage-light hover:bg-sage-light/70"
          : signedOut
          ? "border-ink/10 bg-ink/5"
          : "border-coral-light bg-white hover:bg-coral-light/40"
      } ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <span className="font-display text-base font-semibold text-ink leading-tight">
          {staff.display_name}
        </span>
        <span className="shrink-0 rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-ink/40">
          {staff.role}
        </span>
      </div>
      {signedIn && (
        <span className="mt-1 text-xs font-medium text-sage-dark">
          IN {formatTime(staff.signed_in_at)}
        </span>
      )}
      {signedOut && (
        <span className="mt-1 text-xs text-ink/40">
          Left {formatTime(staff.signed_out_at)}
        </span>
      )}
      {!signedIn && !signedOut && isMe && (
        <span className="mt-1 text-xs text-ink/40">Tap to sign yourself in</span>
      )}
      {!signedIn && !signedOut && !isMe && (
        <span className="mt-1 text-xs text-ink/40">Not signed in</span>
      )}
      {canTap && (
        <span
          className={`mt-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
            signedIn ? "bg-sage text-white" : "bg-coral-light text-coral-dark"
          }`}
        >
          {signedIn ? "Sign Out" : "Sign In"}
        </span>
      )}
    </button>
  );
}

interface VisitorFormProps {
  onDone: () => void;
}

function VisitorForm({ onDone }: VisitorFormProps) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await addVisitor(name, company, reason);
      if (result.error) {
        setError(result.error);
      } else {
        setName("");
        setCompany("");
        setReason("");
        onDone();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-coral-light bg-white p-4 mb-4"
    >
      <p className="mb-3 text-sm font-semibold text-ink">Sign in a visitor</p>
      <div className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Full name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
        />
        <input
          type="text"
          placeholder="Company / organisation (optional)"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
        />
        <input
          type="text"
          placeholder="Reason for visit *"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          className="rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
        />
        {error && <p className="text-xs text-coral-dark">{error}</p>}
        <button
          type="submit"
          disabled={pending || !name.trim() || !reason.trim()}
          className="rounded-full bg-coral py-2.5 text-sm font-semibold text-white hover:bg-coral-dark disabled:opacity-50 transition-colors"
        >
          {pending ? "Signing in…" : "Sign In Visitor"}
        </button>
      </div>
    </form>
  );
}

interface VisitorCardProps {
  visitor: VisitorSignInRow;
}

function VisitorCard({ visitor }: VisitorCardProps) {
  const [pending, startTransition] = useTransition();
  const [showDetail, setShowDetail] = useState(false);
  const signedOut = !!visitor.signed_out_at;

  function handleSignOut() {
    startTransition(async () => {
      await signOutVisitor(visitor.id);
    });
  }

  return (
    <div
      className={`rounded-2xl border-2 px-4 py-3 transition-all ${
        signedOut
          ? "border-ink/10 bg-ink/5 opacity-60"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setShowDetail(!showDetail)}
            className="font-display text-base font-semibold text-ink text-left leading-tight hover:text-coral-dark"
          >
            {visitor.name}
          </button>
          {visitor.company && (
            <p className="text-xs text-ink/50 mt-0.5">{visitor.company}</p>
          )}
          {showDetail && (
            <p className="mt-1 text-sm text-ink/70 bg-white/70 rounded-lg px-2 py-1">
              {visitor.reason}
            </p>
          )}
          <p className="mt-1 text-xs text-ink/50">
            {signedOut
              ? `In ${formatTime(visitor.signed_in_at)} · Out ${formatTime(visitor.signed_out_at)}`
              : `In ${formatTime(visitor.signed_in_at)}`}
          </p>
        </div>
        {!signedOut && (
          <button
            type="button"
            onClick={handleSignOut}
            disabled={pending}
            className="shrink-0 rounded-full bg-ink/10 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-coral-light hover:text-coral-dark disabled:opacity-50 transition-colors"
          >
            {pending ? "…" : "Sign Out"}
          </button>
        )}
      </div>
    </div>
  );
}

interface Props {
  children: ChildSignInRow[];
  staff: StaffSignInRow[];
  visitors: VisitorSignInRow[];
  currentUserId: string;
  today: string;
}

export default function SignInBoard({ children, staff, visitors, currentUserId, today }: Props) {
  const [tab, setTab] = useState<Tab>("children");
  const router = useRouter();

  const refresh = useCallback(() => router.refresh(), [router]);

  useEffect(() => {
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const signedInCount = children.filter((c) => c.attendance_status === "signed_in").length;
  const staffInCount = staff.filter((s) => !!s.signed_in_at && !s.signed_out_at).length;
  const visitorsInCount = visitors.filter((v) => !v.signed_out_at).length;

  const childrenByRoom = new Map<string, ChildSignInRow[]>();
  const noRoom: ChildSignInRow[] = [];
  children.forEach((c) => {
    if (!c.room_id) {
      noRoom.push(c);
    } else {
      const key = c.room_id;
      if (!childrenByRoom.has(key)) childrenByRoom.set(key, []);
      childrenByRoom.get(key)!.push(c);
    }
  });

  const roomGroups: { roomId: string | null; roomName: string; children: ChildSignInRow[] }[] = [];
  children.forEach((c) => {
    if (c.room_id && !roomGroups.find((g) => g.roomId === c.room_id)) {
      roomGroups.push({
        roomId: c.room_id,
        roomName: c.room_name ?? "Unknown Room",
        children: children.filter((ch) => ch.room_id === c.room_id),
      });
    }
  });
  if (noRoom.length > 0) {
    roomGroups.push({ roomId: null, roomName: "Unassigned", children: noRoom });
  }

  const TAB_ITEMS: { id: Tab; label: string; count: number; color: string }[] = [
    { id: "children", label: "Children", count: signedInCount, color: "text-coral-dark" },
    { id: "staff", label: "Staff", count: staffInCount, color: "text-sage-dark" },
    { id: "visitors", label: "Visitors", count: visitorsInCount, color: "text-amber-700" },
  ];

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Sign In / Out</h1>
          <p className="text-sm text-ink/50">{new Date(today + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="rounded-full bg-coral-light px-3 py-1 font-semibold text-coral-dark">{signedInCount} children</span>
          <span className="rounded-full bg-sage-light px-3 py-1 font-semibold text-sage-dark">{staffInCount} staff</span>
          {visitorsInCount > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700">{visitorsInCount} visitors</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-2xl border border-coral-light bg-white p-1">
        {TAB_ITEMS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id
                ? "bg-coral text-white"
                : "text-ink/60 hover:bg-coral-light/50 hover:text-ink"
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-xs ${tab === t.id ? "text-white/70" : t.color}`}>
              {t.count} in
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* Children tab */}
        {tab === "children" && (
          <div className="flex flex-col gap-4">
            {roomGroups.length === 0 ? (
              <p className="text-center text-sm text-ink/40 py-8">No children enrolled yet.</p>
            ) : (
              roomGroups.map((group) => (
                <div key={group.roomId ?? "unassigned"}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/40">
                    {group.roomName}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {group.children.map((child) => (
                      <ChildCard key={child.id} child={child} currentUserId={currentUserId} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Staff tab */}
        {tab === "staff" && (
          <div className="flex flex-col gap-3">
            {staff.length === 0 ? (
              <p className="text-center text-sm text-ink/40 py-8">No staff members found. Add staff via Administration → Staff.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {staff.map((s) => (
                  <StaffCard key={s.user_id} staff={s} currentUserId={currentUserId} />
                ))}
              </div>
            )}
            <p className="text-xs text-ink/30 text-center pt-2">
              You can only sign yourself in. 2IC/Director can sign anyone out.
            </p>
          </div>
        )}

        {/* Visitors tab */}
        {tab === "visitors" && (
          <div className="flex flex-col gap-3">
            <VisitorForm onDone={refresh} />
            {visitors.length === 0 ? (
              <p className="text-center text-sm text-ink/40 py-4">No visitors today.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Today&apos;s visitors</p>
                {visitors.map((v) => (
                  <VisitorCard key={v.id} visitor={v} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
