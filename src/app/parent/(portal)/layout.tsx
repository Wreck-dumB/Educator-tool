import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

export default async function ParentPortalLayout({
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

  // Defense-in-depth alongside proxy.ts's UX-only redirect -- this layout
  // itself refuses to render educator-role content for a parent route.
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "parent") {
    redirect("/generate");
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-coral-light bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <span className="font-display text-lg font-semibold text-coral-dark">SparkPlay for families</span>
          <form action={logout}>
            <button type="submit" className="text-sm font-medium text-ink/60 hover:text-coral-dark">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
