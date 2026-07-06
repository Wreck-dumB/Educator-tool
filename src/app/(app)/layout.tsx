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

  return (
    <WhiteNoiseProvider>
      <div className="flex min-h-screen bg-cream print:block print:bg-white">
        <NavBar email={user.email ?? ""} />
        <div className="flex-1 min-w-0">
          <main className="mx-auto max-w-4xl px-6 py-6 pt-18 md:pt-6 print:max-w-none print:p-0">
            {children}
          </main>
        </div>
      </div>
    </WhiteNoiseProvider>
  );
}
