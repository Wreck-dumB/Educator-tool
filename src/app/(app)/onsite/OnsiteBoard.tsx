"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { VisitorSignInRow } from "@/lib/supabase/signinBoard";
import { signOutVisitor } from "../../(kiosk)/signin/actions";

// Australian NQF ratio tiers
const RATIO_TIERS = [
  { label: "Under 2", maxMonths: 24, ratio: 4 },
  { label: "2–3 yrs", maxMonths: 36, ratio: 5 },
  { label: "3–6 yrs", maxMonths: 72, ratio: 11 },
  { label: "School+", maxMonths: Infinity, ratio: 15 },
];

function ageInMonths(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  return (
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())
  );
}

function ageTier(months: number | null) {
  if (months === null) return RATIO_TIERS[RATIO_TIERS.length - 1];
  return RATIO_TIERS.find((t) => months < t.maxMonths) ?? RATIO_TIERS[RATIO_TIERS.length - 1];
}

function requiredEducators(children: { date_of_birth: string | null }[]): number {
  if (children.length === 0) return 0;
  const sum = children.reduce((acc, c) => {
    const months = ageInMonths(c.date_of_birth);
    const tier = ageTier(months);
    return acc + 1 / tier.ratio;
  }, 0);
  return Math.ceil(sum);
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  });
}

interface ChildOnsite {
  id: string;
  first_name: string;
  date_of_birth: string | null;
  room_id: string | null;
  room_name: string | null;
  signed_in_at: string;
  is_anaphylaxis_risk: boolean | null;
  medical_conditions: string | null;
  dietary_restrictions: string | null;
  additional_needs: string | null;
}

interface StaffOnsite {
  user_id: string;
  display_name: string;
  role: string;
  signed_in_at: string;
}

interface Room {
  id: string;
  name: string;
}

interface RatioRoom {
  room_id: string | null;
  room_name: string;
  children: { id: string; first_name: string; date_of_birth: string | null }[];
  manual_staff_count: number;
  signed_in_staff_count: number;
}

interface Props {
  children: ChildOnsite[];
  staff: StaffOnsite[];
  visitors: VisitorSignInRow[];
  rooms: Room[];
  ratioRooms: RatioRoom[];
  totalSignedInStaff: number;
  today: string;
}

type DetailModal = {
  type: "child";
  name: string;
  room: string | null;
  signedIn: string;
  dob: string | null;
  isAnaphylaxisRisk: boolean | null;
  medicalConditions: string | null;
  dietaryRestrictions: string | null;
  additionalNeeds: string | null;
} | {
  type: "staff";
  name: string;
  role: string;
  signedIn: string;
} | {
  type: "visitor";
  id: string;
  name: string;
  company: string | null;
  reason: string;
  signedIn: string;
};

export default function OnsiteBoard({
  children,
  staff,
  visitors,
  ratioRooms,
  totalSignedInStaff,
  today,
}: Props) {
  const router = useRouter();
  const [showRatios, setShowRatios] = useState(false);
  const [modal, setModal] = useState<DetailModal | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => router.refresh(), [router]);

  useEffect(() => {
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const lastRefresh = new Date().toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  });

  function handleSignOutVisitor(id: string) {
    startTransition(async () => {
      await signOutVisitor(id);
      setModal(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">On Site Now</h1>
          <p className="text-sm text-ink/50">
            {new Date(today + "T00:00:00").toLocaleDateString("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink/30">Refreshed {lastRefresh}</span>
          <button
            type="button"
            onClick={refresh}
            className="rounded-full border border-coral-light px-3 py-1.5 text-xs font-medium text-ink/50 hover:bg-coral-light transition-colors"
          >
            Refresh
          </button>
          <Link
            href="/signin"
            className="rounded-full bg-coral px-4 py-1.5 text-xs font-semibold text-white hover:bg-coral-dark transition-colors"
          >
            Sign In / Out
          </Link>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 rounded-2xl border border-coral-light bg-coral-light/30 px-4 py-3 text-center">
          <p className="font-display text-3xl font-bold text-coral-dark">{children.length}</p>
          <p className="text-xs font-semibold text-coral-dark/60 uppercase tracking-widest">Children</p>
        </div>
        <div className="flex-1 rounded-2xl border border-sage-light bg-sage-light/30 px-4 py-3 text-center">
          <p className="font-display text-3xl font-bold text-sage-dark">{staff.length}</p>
          <p className="text-xs font-semibold text-sage-dark/60 uppercase tracking-widest">Staff</p>
        </div>
        <div className="flex-1 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
          <p className="font-display text-3xl font-bold text-amber-700">{visitors.length}</p>
          <p className="text-xs font-semibold text-amber-600/70 uppercase tracking-widest">Visitors</p>
        </div>
      </div>

      {/* Medical alerts — children currently on site with health flags */}
      {(() => {
        const alerts = children.filter(
          (c) => c.is_anaphylaxis_risk || c.medical_conditions || c.dietary_restrictions || c.additional_needs,
        );
        if (alerts.length === 0) return null;
        return (
          <div className="rounded-2xl border-2 border-coral bg-coral-light/40 px-4 py-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-coral-dark">
              <span aria-hidden>⚠️</span> Medical / Dietary Alerts — {alerts.length} child{alerts.length !== 1 ? "ren" : ""} on site
            </p>
            <div className="flex flex-col gap-3">
              {alerts.map((c) => (
                <div key={c.id} className="rounded-xl bg-white px-4 py-3">
                  <p className="font-display font-semibold text-ink">{c.first_name}</p>
                  {c.is_anaphylaxis_risk && (
                    <p className="mt-1 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
                      ANAPHYLAXIS RISK — EpiPen protocol applies
                    </p>
                  )}
                  {c.medical_conditions && (
                    <p className="mt-1 text-sm text-ink/80">
                      <span className="font-semibold text-coral-dark">Medical: </span>{c.medical_conditions}
                    </p>
                  )}
                  {c.dietary_restrictions && (
                    <p className="mt-1 text-sm text-ink/80">
                      <span className="font-semibold text-coral-dark">Dietary: </span>{c.dietary_restrictions}
                    </p>
                  )}
                  {c.additional_needs && (
                    <p className="mt-1 text-sm text-ink/80">
                      <span className="font-semibold text-ink/60">Notes: </span>{c.additional_needs}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Person cards — 3 columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        {/* Children */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-coral-dark">
            Children ({children.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {children.length === 0 && (
              <p className="text-sm text-ink/30 py-2">None signed in</p>
            )}
            {children.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  setModal({
                    type: "child",
                    name: c.first_name,
                    room: c.room_name,
                    signedIn: c.signed_in_at,
                    dob: c.date_of_birth,
                    isAnaphylaxisRisk: c.is_anaphylaxis_risk,
                    medicalConditions: c.medical_conditions,
                    dietaryRestrictions: c.dietary_restrictions,
                    additionalNeeds: c.additional_needs,
                  })
                }
                className={`flex items-center justify-between rounded-xl border bg-white px-3 py-2.5 text-left hover:bg-coral-light/30 transition-colors ${c.is_anaphylaxis_risk ? "border-red-300" : "border-coral-light"}`}
              >
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    {c.first_name}
                    {c.is_anaphylaxis_risk && <span className="text-red-600 text-xs font-bold">EPI</span>}
                    {!c.is_anaphylaxis_risk && (c.medical_conditions || c.dietary_restrictions) && (
                      <span className="text-amber-600 text-xs">⚠</span>
                    )}
                  </p>
                  {c.room_name && (
                    <p className="text-xs text-ink/40">{c.room_name}</p>
                  )}
                </div>
                <span className="text-xs text-ink/30">{formatTime(c.signed_in_at)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Staff */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-sage-dark">
            Staff ({staff.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {staff.length === 0 && (
              <p className="text-sm text-ink/30 py-2">No staff signed in</p>
            )}
            {staff.map((s) => (
              <button
                key={s.user_id}
                type="button"
                onClick={() =>
                  setModal({
                    type: "staff",
                    name: s.display_name,
                    role: s.role,
                    signedIn: s.signed_in_at,
                  })
                }
                className="flex items-center justify-between rounded-xl border border-sage-light bg-white px-3 py-2.5 text-left hover:bg-sage-light/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{s.display_name}</p>
                  <p className="text-xs capitalize text-ink/40">{s.role}</p>
                </div>
                <span className="text-xs text-ink/30">{formatTime(s.signed_in_at)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Visitors */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-700">
            Visitors ({visitors.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {visitors.length === 0 && (
              <p className="text-sm text-ink/30 py-2">No visitors</p>
            )}
            {visitors.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() =>
                  setModal({
                    type: "visitor",
                    id: v.id,
                    name: v.name,
                    company: v.company,
                    reason: v.reason,
                    signedIn: v.signed_in_at,
                  })
                }
                className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-left hover:bg-amber-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{v.name}</p>
                  {v.company && (
                    <p className="text-xs text-ink/40">{v.company}</p>
                  )}
                </div>
                <span className="text-xs text-ink/30">{formatTime(v.signed_in_at)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ratio toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowRatios(!showRatios)}
          className="flex w-full items-center justify-between rounded-2xl border border-coral-light bg-white px-4 py-3 text-left hover:bg-coral-light/20 transition-colors"
        >
          <span className="font-display font-semibold text-ink">
            Supervision Ratios
          </span>
          <span className="text-xs text-ink/40">{showRatios ? "▲ Hide" : "▼ View"}</span>
        </button>

        {showRatios && (
          <div className="mt-2 flex flex-col gap-3">
            {ratioRooms.length === 0 && (
              <p className="text-sm text-ink/40 text-center py-4">No children currently signed in.</p>
            )}
            {ratioRooms.map((room) => {
              const required = requiredEducators(room.children);
              const actual = room.manual_staff_count > 0
                ? room.manual_staff_count
                : totalSignedInStaff;
              const inRatio = actual >= required;
              const borderline = actual === required;

              return (
                <div
                  key={room.room_id ?? "unassigned"}
                  className={`rounded-2xl border-2 p-4 ${
                    inRatio
                      ? borderline
                        ? "border-amber-300 bg-amber-50"
                        : "border-sage-light bg-sage-light/30"
                      : "border-coral bg-coral-light/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-display font-semibold text-ink">{room.room_name}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        inRatio
                          ? borderline
                            ? "bg-amber-200 text-amber-800"
                            : "bg-sage text-white"
                          : "bg-coral text-white"
                      }`}
                    >
                      {inRatio ? (borderline ? "Minimal" : "In Ratio") : "Under Ratio"}
                    </span>
                  </div>

                  {/* Staff count */}
                  <div className="flex items-center gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-ink/50 text-xs uppercase tracking-widest">Required</span>
                      <p className="font-bold text-ink text-lg leading-tight">{required} educator{required !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="h-8 w-px bg-ink/10" />
                    <div>
                      <span className="text-ink/50 text-xs uppercase tracking-widest">
                        {room.manual_staff_count > 0 ? "In this room" : "On site"}
                      </span>
                      <p className={`font-bold text-lg leading-tight ${inRatio ? "text-sage-dark" : "text-coral-dark"}`}>
                        {actual} educator{actual !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Children list sorted by DOB (youngest first) */}
                  <div className="flex flex-col gap-1">
                    {room.children.map((c) => {
                      const months = ageInMonths(c.date_of_birth);
                      const tier = ageTier(months);
                      const ageLabel = months !== null
                        ? `${Math.floor(months / 12)}y ${months % 12}m`
                        : "Age unknown";
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-1.5 text-sm"
                        >
                          <span className="font-medium text-ink">{c.first_name}</span>
                          <div className="flex items-center gap-2 text-xs text-ink/50">
                            <span>{ageLabel}</span>
                            <span className="rounded bg-ink/5 px-1.5 py-0.5 font-medium">
                              1:{tier.ratio}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {room.manual_staff_count === 0 && (
                    <p className="mt-2 text-[11px] text-ink/30">
                      No manual room count set — showing total signed-in staff. Update room counts in Attendance for per-room accuracy.
                    </p>
                  )}
                </div>
              );
            })}

            {/* Ratio legend */}
            <div className="rounded-xl border border-ink/10 bg-white px-4 py-3 text-xs text-ink/50">
              <p className="font-semibold mb-1 text-ink/70">Australian NQF ratio tiers</p>
              <div className="flex flex-wrap gap-3">
                {RATIO_TIERS.map((t) => (
                  <span key={t.label}>
                    {t.label}: 1:{t.ratio}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {modal.type === "child" && (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-coral-dark mb-1">Child</p>
                <h2 className="font-display text-2xl font-bold text-ink">{modal.name}</h2>
                {modal.room && <p className="mt-1 text-sm text-ink/60">{modal.room}</p>}
                {modal.dob && (
                  <p className="mt-1 text-sm text-ink/60">
                    DOB: {new Date(modal.dob).toLocaleDateString("en-AU")} ({ageInMonths(modal.dob)} months)
                  </p>
                )}
                <p className="mt-1 text-sm text-ink/60">Signed in at {formatTime(modal.signedIn)}</p>
                {(modal.isAnaphylaxisRisk || modal.medicalConditions || modal.dietaryRestrictions || modal.additionalNeeds) && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    {modal.isAnaphylaxisRisk && (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                        ANAPHYLAXIS RISK — EpiPen protocol applies
                      </p>
                    )}
                    {modal.medicalConditions && (
                      <div className="rounded-lg bg-coral-light/40 px-3 py-2">
                        <p className="text-xs font-semibold text-coral-dark">Medical conditions</p>
                        <p className="text-sm text-ink">{modal.medicalConditions}</p>
                      </div>
                    )}
                    {modal.dietaryRestrictions && (
                      <div className="rounded-lg bg-amber-50 px-3 py-2">
                        <p className="text-xs font-semibold text-amber-700">Dietary restrictions</p>
                        <p className="text-sm text-ink">{modal.dietaryRestrictions}</p>
                      </div>
                    )}
                    {modal.additionalNeeds && (
                      <div className="rounded-lg bg-ink/5 px-3 py-2">
                        <p className="text-xs font-semibold text-ink/60">Additional needs / notes</p>
                        <p className="text-sm text-ink">{modal.additionalNeeds}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {modal.type === "staff" && (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-sage-dark mb-1">Staff</p>
                <h2 className="font-display text-2xl font-bold text-ink">{modal.name}</h2>
                <p className="mt-1 text-sm capitalize text-ink/60">{modal.role}</p>
                <p className="mt-2 text-sm text-ink/60">Signed in at {formatTime(modal.signedIn)}</p>
              </>
            )}
            {modal.type === "visitor" && (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-1">Visitor</p>
                <h2 className="font-display text-2xl font-bold text-ink">{modal.name}</h2>
                {modal.company && <p className="mt-1 text-sm text-ink/60">{modal.company}</p>}
                <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2">
                  <p className="text-xs font-semibold text-amber-700 mb-0.5">Reason for visit</p>
                  <p className="text-sm text-ink">{modal.reason}</p>
                </div>
                <p className="mt-2 text-sm text-ink/60">Signed in at {formatTime(modal.signedIn)}</p>
                <button
                  type="button"
                  onClick={() => handleSignOutVisitor(modal.id)}
                  disabled={pending}
                  className="mt-4 w-full rounded-full bg-ink/10 py-2.5 text-sm font-semibold text-ink hover:bg-coral-light hover:text-coral-dark disabled:opacity-50 transition-colors"
                >
                  {pending ? "Signing out…" : "Sign Out Visitor"}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setModal(null)}
              className="mt-4 w-full rounded-full border border-ink/10 py-2 text-sm text-ink/50 hover:bg-ink/5 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
