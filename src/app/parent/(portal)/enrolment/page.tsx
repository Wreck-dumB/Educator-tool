import { getChildren } from "@/lib/supabase/children";
import { cardClass, errorBannerClass, successBannerClass } from "@/lib/ui";
import ChildEnrolmentSection from "./ChildEnrolmentSection";

export default async function ParentEnrolmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const children = await getChildren();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-coral-dark">Update Enrolment</h1>
        <p className="mt-1 text-sm text-ink/60">
          Propose updates to your child&apos;s details, upload documents, and manage emergency
          contacts from home. Everything you submit is reviewed by the service before it&apos;s
          applied — nothing changes on file until then.
        </p>
      </div>

      {error && <p className={errorBannerClass}>{error}</p>}
      {message && <p className={successBannerClass}>{message}</p>}

      {children.length === 0 ? (
        <p className={`p-5 text-sm text-ink/50 ${cardClass}`}>
          No children are linked to your account yet. Ask your child&apos;s educator for an invite link.
        </p>
      ) : (
        children.map((child) => <ChildEnrolmentSection key={child.id} child={child} />)
      )}
    </div>
  );
}
