import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isPlatformOwner } from "@/lib/supabase/serviceAccess";

// Platform-owner-only area (Dan). Everyone else is bounced. This is the single
// entry gate for the whole /owner segment.
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isPlatformOwner(user.email)) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8">
          <span className="font-display text-xl font-semibold text-coral-dark">DR. SparkPlay</span>
          <p className="text-xs uppercase tracking-wide text-ink/40">Platform owner</p>
          <nav className="mt-3 flex gap-4 text-sm">
            <Link href="/owner/businesses" className="text-ink/60 hover:text-coral-dark">Businesses</Link>
            <Link href="/owner/library-review" className="text-ink/60 hover:text-coral-dark">Library review</Link>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
