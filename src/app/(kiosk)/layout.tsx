import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function KioskLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      {/* Kiosk header — no nav links, no access to the rest of the app */}
      <div className="flex items-center justify-between border-b border-coral-light bg-white px-5 py-3 print:hidden">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-lg font-semibold text-coral-dark">
            ✨ SparkPlay
          </span>
          <span className="rounded-full bg-coral-light px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest text-coral-dark">
            Kiosk
          </span>
        </div>
        {/* Discreet exit — intentionally low contrast so visitors don't see it */}
        <Link
          href="/dashboard"
          className="text-xs text-ink/20 transition-colors hover:text-ink/50"
        >
          Exit kiosk
        </Link>
      </div>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
