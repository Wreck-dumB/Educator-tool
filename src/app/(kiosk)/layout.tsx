import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";

export default async function KioskLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: service } = await supabase
    .from("services")
    .select("name, display_name, logo_path")
    .maybeSingle();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const logoUrl = service?.logo_path
    ? `${supabaseUrl}/storage/v1/object/public/service-logos/${service.logo_path}`
    : null;
  const centreName = service?.display_name ?? service?.name ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      {/* Kiosk header — no nav links, no access to the rest of the app */}
      <div className="flex items-center justify-between border-b border-coral-light bg-white px-5 py-3 print:hidden">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="relative h-12 max-w-[180px] min-w-[60px]">
              <Image
                src={logoUrl}
                alt={centreName ?? "Centre logo"}
                fill
                className="object-contain object-left"
                unoptimized
              />
            </div>
          ) : null}

          {centreName && centreName !== "My Service" ? (
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-semibold text-ink leading-tight">
                {centreName}
              </span>
              <span className="rounded-full bg-coral-light px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest text-coral-dark">
                Kiosk
              </span>
            </div>
          ) : !logoUrl ? (
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-semibold text-coral-dark">
                ✨ DR. SparkPlay
              </span>
              <span className="rounded-full bg-coral-light px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest text-coral-dark">
                Kiosk
              </span>
            </div>
          ) : (
            <span className="rounded-full bg-coral-light px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest text-coral-dark">
              Kiosk
            </span>
          )}
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
