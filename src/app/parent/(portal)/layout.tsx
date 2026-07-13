import Link from "next/link";
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

  const { count: unreadCount } = await supabase
    .from("parent_notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", user.id)
    .is("read_at", null);

  const unread = unreadCount ?? 0;

  const NAV_LINKS = [
    { href: "/parent", label: "Home" },
    { href: "/parent/observations", label: "Observations" },
    { href: "/parent/diary", label: "Diary" },
    { href: "/parent/messages", label: "Messages" },
    { href: "/parent/wall", label: "Wall" },
    { href: "/parent/permission-slips", label: "Permission Slips" },
    { href: "/parent/absences", label: "Absences" },
    { href: "/parent/casual-days", label: "Casual Days" },
  ];

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-coral-light bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-display text-base font-semibold text-coral-dark mr-3">DR. SparkPlay</span>
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-full px-3 py-1 text-sm font-medium text-ink/60 hover:bg-coral-light hover:text-coral-dark transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {unread > 0 && (
              <span className="rounded-full bg-coral px-2.5 py-0.5 text-xs font-bold text-white">
                {unread} new
              </span>
            )}
            <form action={logout}>
              <button type="submit" className="text-sm font-medium text-ink/60 hover:text-coral-dark">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
