import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/layout/NavBar";
import { WhiteNoiseProvider } from "@/components/providers/WhiteNoiseProvider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Gate on terms acceptance. /accept-terms lives outside this route group
  // so this check never runs on that page itself.
  const { data: profile } = await supabase
    .from("profiles")
    .select("terms_accepted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && !profile.terms_accepted_at) {
    redirect("/accept-terms");
  }

  return (
    <WhiteNoiseProvider>
      <div className="flex min-h-screen bg-cream print:block print:bg-white">
        <NavBar email={user.email ?? ""} />
        <div className="flex flex-col flex-1 min-w-0">
          <main className="flex-1 mx-auto w-full max-w-4xl px-6 py-6 pt-18 md:pt-6 print:max-w-none print:p-0">
            {children}
          </main>
          <footer className="border-t border-ink/10 px-6 py-3 print:hidden">
            <div className="mx-auto max-w-4xl flex flex-wrap items-center justify-between gap-2 text-xs text-ink/30">
              <span>DR. SparkPlay &copy; {new Date().getFullYear()}</span>
              <div className="flex gap-4">
                <a href="/privacy" className="hover:text-ink/60 hover:underline">Privacy Policy</a>
                <a href="/terms" className="hover:text-ink/60 hover:underline">Terms of Service</a>
                <a href="mailto:support@sparkplay.app" className="hover:text-ink/60 hover:underline">Contact</a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </WhiteNoiseProvider>
  );
}
