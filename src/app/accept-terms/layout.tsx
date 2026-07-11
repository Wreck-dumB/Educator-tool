import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AcceptTermsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {children}
      </div>
    </div>
  );
}
