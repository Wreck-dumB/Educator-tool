"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/auth/actions";

const LINKS = [
  { href: "/generate", label: "Generate" },
  { href: "/programs", label: "Programs" },
  { href: "/milestones", label: "Milestones" },
  { href: "/activities", label: "Activities" },
  { href: "/risk-assessments", label: "Risk Assessments" },
  { href: "/safe-work-procedures", label: "Safe Work" },
  { href: "/policies", label: "Policies" },
  { href: "/qip", label: "QIP" },
  { href: "/children", label: "Children" },
  { href: "/materials", label: "Materials" },
  { href: "/observations", label: "Observations" },
];

export default function NavBar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-coral-light bg-cream print:hidden">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/generate" className="font-display flex items-center gap-1.5 text-xl font-semibold text-coral-dark">
          <span aria-hidden>✨</span> SparkPlay
        </Link>
        <nav className="flex flex-wrap items-center gap-1.5 text-sm">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                  active
                    ? "bg-coral text-white"
                    : "text-ink/70 hover:bg-coral-light hover:text-coral-dark"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <span className="ml-2 hidden text-ink/40 sm:inline">{email}</span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full px-3 py-1.5 font-medium text-sage-dark hover:bg-sage-light"
            >
              Log out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
