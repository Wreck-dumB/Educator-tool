import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { cardClass } from "@/lib/ui";
import TransitionEditor from "../TransitionEditor";
import PrintButton from "@/components/PrintButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Transition Statement · SparkPlay" };

const TYPE_LABELS: Record<string, string> = {
  to_school: "Transition to School Statement",
  between_rooms: "Room Transition Statement",
  between_services: "Service Transition Statement",
};

export default async function TransitionEditPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; type?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/onboarding");

  const { child: childId, type: transitionType } = await searchParams;

  if (!childId || !["to_school", "between_rooms", "between_services"].includes(transitionType ?? "")) {
    redirect("/transitions");
  }

  const safeType = transitionType as "to_school" | "between_rooms" | "between_services";

  const [{ data: child }, { data: existing }] = await Promise.all([
    supabase
      .from("children")
      .select("id, first_name, date_of_birth, current_interests")
      .eq("id", childId)
      .maybeSingle(),
    supabase
      .from("transition_statements")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .eq("child_id", childId)
      .eq("transition_type", safeType)
      .maybeSingle(),
  ]);

  if (!child) redirect("/transitions");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/transitions" className="text-sm text-coral-dark hover:underline">
            ← Back to statements
          </Link>
          <h1 className="font-display mt-1 text-2xl font-bold text-ink">
            {child.first_name} — {TYPE_LABELS[safeType] ?? safeType}
          </h1>
          {child.current_interests && (
            <p className="mt-1 text-sm text-ink/50">
              Current interests: {child.current_interests}
            </p>
          )}
        </div>
        <PrintButton />
      </div>

      <div className={cardClass + " p-5"}>
        <TransitionEditor
          childId={childId}
          childName={child.first_name}
          initialText={existing?.draft_text ?? null}
          transitionType={safeType}
          isFinalized={!!existing?.finalized_at}
        />
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
        AI-generated drafts are a starting point only. Review and personalise all content before
        finalising. Never include a child&apos;s personal details (full name, address, DOB) in a
        statement shared externally.
      </div>
    </div>
  );
}
