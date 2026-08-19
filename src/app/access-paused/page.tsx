import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServiceAccess, isPlatformOwner } from "@/lib/supabase/serviceAccess";
import { logout } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Access paused · DR. SparkPlay" };

export default async function AccessPausedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // If access is actually fine (or this is a platform owner), don't strand the
  // user here — send them back into the app.
  if (isPlatformOwner(user.email)) redirect("/dashboard");
  const access = await getServiceAccess();
  if (access.allowed) redirect("/dashboard");

  const heading =
    access.status === "expired" || access.status === "trial"
      ? "Your trial has ended"
      : "Access is paused";

  return (
    <>
      <div className="text-center mb-6">
        <span className="font-display text-2xl font-semibold text-coral-dark">DR. SparkPlay</span>
        <h1 className="mt-2 text-xl font-semibold text-ink">{heading}</h1>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-5 space-y-4 text-sm text-ink/80">
        <p>
          Your service&apos;s access to DR. SparkPlay isn&apos;t active right now, so the app is
          temporarily unavailable. Your data is safe and untouched — nothing has been deleted.
        </p>
        <p>
          To reactivate your centre, or if you think this is a mistake, please get in touch and
          we&apos;ll sort it out with you.
        </p>
        <p>
          <a
            href="mailto:support@drsparkplay.com.au?subject=Reactivate%20my%20DR.%20SparkPlay%20access"
            className="font-medium text-coral-dark hover:underline"
          >
            support@drsparkplay.com.au
          </a>
        </p>
        <form action={logout} className="pt-2">
          <button
            type="submit"
            className="text-sm text-ink/50 hover:text-ink/80 hover:underline"
          >
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
