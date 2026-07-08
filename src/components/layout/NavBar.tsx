"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/auth/actions";
import { useWhiteNoise } from "@/components/providers/WhiteNoiseProvider";

const NAV_GROUPS = [
  {
    label: "Today",
    items: [
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    label: "Educator Tools",
    items: [
      { href: "/generate", label: "Generate" },
      { href: "/activities", label: "Activities" },
      { href: "/observations", label: "Observations" },
      { href: "/programs", label: "Programs" },
      { href: "/milestones", label: "Milestones" },
      { href: "/materials", label: "Materials" },
      { href: "/recipes", label: "Recipes" },
      { href: "/auslan", label: "Auslan Dictionary" },
      { href: "/posters", label: "Posters & Fliers" },
      { href: "/white-noise", label: "White Noise" },
    ],
  },
  {
    label: "Enrolments",
    items: [
      { href: "/children", label: "Children" },
      { href: "/rooms", label: "Rooms" },
    ],
  },
  {
    label: "Daily Forms",
    items: [
      { href: "/digest", label: "Daily Digest" },
      { href: "/incident-reports", label: "Incidents" },
      { href: "/permission-slips", label: "Permission Slips" },
      { href: "/forms", label: "Document Templates" },
      { href: "/sleep", label: "Sleep Chart" },
      { href: "/food", label: "Food Chart" },
      { href: "/nappy", label: "Nappy Chart" },
    ],
  },
  {
    label: "Centre Information",
    items: [
      { href: "/policies", label: "Policies" },
      { href: "/safe-work-procedures", label: "Safe Work" },
      { href: "/qip", label: "QIP" },
      { href: "/risk-assessments", label: "Risk Assessments" },
      { href: "/import", label: "Import & Review" },
    ],
  },
  {
    label: "Roll Call / Attendance",
    items: [{ href: "/attendance", label: "Roll Call" }],
  },
  {
    label: "Family",
    items: [{ href: "/messages", label: "Messages" }],
  },
  {
    label: "Administration",
    items: [{ href: "/staff", label: "Staff" }],
  },
];

export default function NavBar({ email }: { email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { playing, stop } = useWhiteNoise();

  const sidebar = (
    <aside className="flex h-full w-56 flex-shrink-0 flex-col border-r border-coral-light bg-white">
      {/* Logo */}
      <div className="border-b border-coral-light px-4 py-4">
        <Link
          href="/dashboard"
          onClick={() => setOpen(false)}
          className="font-display flex items-center gap-1.5 text-xl font-semibold text-coral-dark"
        >
          <span aria-hidden>✨</span> SparkPlay
        </Link>
      </div>

      {/* Search */}
      <form method="GET" action="/search" className="border-b border-coral-light px-3 py-2">
        <input
          type="search"
          name="q"
          placeholder="Search…"
          className="w-full rounded-lg border border-coral-light bg-white/70 px-3 py-1.5 text-xs text-ink placeholder-ink/30 focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
        />
      </form>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-ink/40">
              {group.label}
            </p>

            {group.items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center border-l-2 px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-coral bg-coral-light text-coral-dark"
                      : "border-transparent text-ink/60 hover:bg-coral-light/50 hover:text-coral-dark"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* White noise playing indicator */}
      {playing && (
        <div className="mx-3 mb-2 flex items-center justify-between rounded-xl bg-sage-light px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-sage" />
            <span className="text-xs font-medium text-sage-dark">White noise on</span>
          </div>
          <button
            type="button"
            onClick={stop}
            className="text-xs text-sage-dark/60 hover:text-sage-dark"
            aria-label="Stop white noise"
          >
            ■ Stop
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-coral-light px-4 py-3">
        <p className="mb-2 truncate text-xs text-ink/40">{email}</p>
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-md px-3 py-1.5 text-left text-sm font-medium text-sage-dark hover:bg-sage-light"
          >
            Log out
          </button>
        </form>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: static sidebar */}
      <div className="hidden md:flex md:h-screen md:flex-col print:hidden">
        {sidebar}
      </div>

      {/* Mobile: fixed top bar + slide-in drawer */}
      <div className="md:hidden print:hidden">
        <div className="fixed inset-x-0 top-0 z-40 flex h-12 items-center justify-between border-b border-coral-light bg-white px-4">
          <Link href="/generate" className="font-display flex items-center gap-1.5 text-lg font-semibold text-coral-dark">
            <span aria-hidden>✨</span> SparkPlay
          </Link>
          <button
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            className="rounded-md p-1.5 text-coral-dark hover:bg-coral-light"
          >
            {open ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Overlay */}
        {open && (
          <div
            className="fixed inset-0 z-30 bg-black/30"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Drawer */}
        <div
          className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebar}
        </div>
      </div>
    </>
  );
}
