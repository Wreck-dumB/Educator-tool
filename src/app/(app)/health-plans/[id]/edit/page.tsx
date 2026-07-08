import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { inputClass, cardClass, primaryButtonClass } from "@/lib/ui";
import { updateHealthPlan } from "../../actions";

const PLAN_TYPES = ["asthma", "anaphylaxis", "diabetes", "allergies", "epilepsy", "other"] as const;
const PLAN_TYPE_LABELS: Record<string, string> = {
  asthma: "Asthma", anaphylaxis: "Anaphylaxis", diabetes: "Diabetes",
  allergies: "Allergies", epilepsy: "Epilepsy", other: "Other",
};

export default async function EditHealthPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: plan } = await supabase.from("child_health_plans").select("*").eq("id", id).maybeSingle();
  if (!plan) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/health-plans" className="text-sm text-coral-dark hover:underline">← Health plans</Link>
      <h1 className="font-display mt-2 text-2xl font-semibold text-coral-dark">Edit plan</h1>
      <div className={`mt-4 p-5 ${cardClass}`}>
        <form action={updateHealthPlan} className="space-y-3">
          <input type="hidden" name="id" value={plan.id} />
          <div>
            <label className="block text-xs font-medium text-ink/60">Plan type</label>
            <select name="plan_type" required defaultValue={plan.plan_type} className={inputClass}>
              {PLAN_TYPES.map((t) => <option key={t} value={t}>{PLAN_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <input name="plan_name" type="text" required defaultValue={plan.plan_name} placeholder="Plan name" className={inputClass} />
          <textarea name="triggers" rows={2} defaultValue={plan.triggers ?? ""} placeholder="Known triggers (optional)" className={inputClass} />
          <textarea name="signs_and_symptoms" rows={2} defaultValue={plan.signs_and_symptoms ?? ""} placeholder="Signs and symptoms" className={inputClass} />
          <textarea name="emergency_steps" rows={3} required defaultValue={plan.emergency_steps} placeholder="Emergency steps" className={inputClass} />
          <input name="emergency_medication" type="text" defaultValue={plan.emergency_medication ?? ""} placeholder="Emergency medication" className={inputClass} />
          <div>
            <label className="block text-xs font-medium text-ink/60">Review / expiry date</label>
            <input name="review_date" type="date" defaultValue={plan.review_date ?? ""} className={inputClass} />
          </div>
          <button type="submit" className={`w-full ${primaryButtonClass}`}>Save changes</button>
        </form>
      </div>
    </div>
  );
}
