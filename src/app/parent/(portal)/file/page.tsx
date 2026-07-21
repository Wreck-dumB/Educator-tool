import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChildren } from "@/lib/supabase/children";
import { cardClass } from "@/lib/ui";
import PrintButton from "./PrintButton";

const IMMUNISATION_LABELS: Record<string, string> = {
  up_to_date: "Up to date",
  medical_exemption: "Medical exemption",
  approved_catch_up: "Approved catch-up",
  not_sighted: "Not sighted",
  overdue: "Overdue",
};

function ageFromDob(dob: string | null): string | null {
  if (!dob) return null;
  const b = new Date(dob);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years--;
  return `${years} year${years === 1 ? "" : "s"} old`;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="border-b border-coral-light/50 py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink/40">{label}</dt>
      <dd className={`mt-0.5 text-sm ${value ? "text-ink" : "text-ink/30"}`}>
        {value || "Not recorded"}
      </dd>
    </div>
  );
}

export default async function ParentFilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const children = await getChildren();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">Your child&apos;s file</h1>
          <p className="mt-1 text-sm text-ink/60">
            This is the personal information the service holds about your child. Under the Australian
            Privacy Act (Australian Privacy Principle 12) you have the right to access it. If anything
            here is inaccurate or out of date, contact the service to have it corrected.
          </p>
        </div>
        {children.length > 0 && (
          <div className="print:hidden">
            <PrintButton />
          </div>
        )}
      </div>

      {children.length === 0 ? (
        <p className={`p-5 text-sm text-ink/50 ${cardClass}`}>
          No children are linked to your account yet. Ask your child&apos;s educator for an invite link.
        </p>
      ) : (
        children.map((child) => {
          const age = ageFromDob(child.date_of_birth);
          const dob = child.date_of_birth
            ? new Date(child.date_of_birth).toLocaleDateString("en-AU")
            : null;
          return (
            <div key={child.id} className={`p-5 ${cardClass}`}>
              <h2 className="font-display text-xl font-semibold text-ink">🧒 {child.first_name}</h2>

              <h3 className="mt-4 text-sm font-semibold text-coral-dark">Profile</h3>
              <dl className="mt-1">
                <Field label="First name" value={child.first_name} />
                <Field
                  label="Date of birth"
                  value={dob ? `${dob}${age ? ` (${age})` : ""}` : null}
                />
                <Field label="Home address" value={child.address} />
                <Field label="Current interests" value={child.current_interests} />
                <Field label="Additional needs" value={child.additional_needs} />
              </dl>

              <h3 className="mt-4 text-sm font-semibold text-coral-dark">Health &amp; medical</h3>
              <dl className="mt-1">
                <Field label="Medical conditions" value={child.medical_conditions} />
                <Field
                  label="Anaphylaxis risk"
                  value={child.is_anaphylaxis_risk ? "Yes" : "No"}
                />
                <Field label="Medical management plan" value={child.medical_management_plan} />
                <Field label="Dietary restrictions" value={child.dietary_restrictions} />
                <Field label="Medicare number" value={child.medicare_number} />
                <Field
                  label="Medical practice"
                  value={
                    child.medical_practice_name
                      ? `${child.medical_practice_name}${child.medical_practice_phone ? ` — ${child.medical_practice_phone}` : ""}`
                      : null
                  }
                />
                <Field
                  label="Immunisation status"
                  value={
                    child.immunisation_status
                      ? IMMUNISATION_LABELS[child.immunisation_status] ?? child.immunisation_status
                      : null
                  }
                />
              </dl>

              <h3 className="mt-4 text-sm font-semibold text-coral-dark">Enrolment</h3>
              <dl className="mt-1">
                <Field
                  label="Enrolment status"
                  value={
                    child.enrolment_ended_at
                      ? `Ended ${new Date(child.enrolment_ended_at).toLocaleDateString("en-AU")}`
                      : "Currently enrolled"
                  }
                />
              </dl>
            </div>
          );
        })
      )}

      <p className="text-xs text-ink/40 print:hidden">
        Note: your child&apos;s day-to-day records — observations, daily diary, messages, and shared
        documents — are available on the other tabs. This page shows the enrolment and health
        information held on file.
      </p>
    </div>
  );
}
