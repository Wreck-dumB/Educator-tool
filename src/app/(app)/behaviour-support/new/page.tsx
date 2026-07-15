import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { NewBSPForm } from "./NewBSPForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Behaviour Support Plan · DR. SparkPlay",
};

export default async function NewBehaviourSupportPlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/");

  const { data: childRows } = await supabase
    .from("children")
    .select("id, first_name, current_interests")
    .eq("owner_user_id", ownerUserId)
    .order("first_name");

  const children = childRows ?? [];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-coral-dark">
        New Behaviour Support Plan
      </h1>
      <p className="mt-1 text-sm text-ink/60">
        Fill in the behaviour details, generate AI-suggested strategies, then activate to share with
        the family.
      </p>
      <p className="mt-1 text-xs text-ink/40">
        This plan is confidential and only visible to the child&apos;s linked parents. It is not a
        clinical diagnosis.
      </p>

      {children.length === 0 ? (
        <p className="mt-6 text-sm text-ink/50">
          No children enrolled. Add children under Enrolments first.
        </p>
      ) : (
        <NewBSPForm children={children} />
      )}
    </div>
  );
}
