import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/layout/NavBar";

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

  return (
    <div className="min-h-screen bg-cream print:bg-white">
      <NavBar email={user.email ?? ""} />
      <main className="mx-auto max-w-5xl px-4 py-6 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
