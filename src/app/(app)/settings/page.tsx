import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyStaffRole } from "@/lib/supabase/staff";
import SettingsClient from "./SettingsClient";
import WithdrawConsentButton from "@/components/WithdrawConsentButton";
import { cardClass } from "@/lib/ui";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await getMyStaffRole();
  if (!role) redirect("/onboarding");

  const { data: service } = await supabase
    .from("services")
    .select("name, display_name, logo_path, preferred_observation_types, ai_data_notice_accepted_at, approved_provider_number, service_approval_number, nominated_supervisor_name, nominated_supervisor_phone, nominated_supervisor_email, material_alert_lead_days, jurisdiction")
    .maybeSingle();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const logoUrl = service?.logo_path
    ? `${supabaseUrl}/storage/v1/object/public/service-logos/${service.logo_path}`
    : null;

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("media_consent_at, media_consent_withdrawn_at")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Service Settings</h1>
      <p className="text-sm text-ink/50 mb-6">
        Customise how your centre appears on the kiosk and in the app.
      </p>
      <SettingsClient
        isDirector={role === "director"}
        currentLogoUrl={logoUrl}
        currentDisplayName={service?.display_name ?? null}
        serviceName={service?.name ?? "My Service"}
        preferredObservationTypes={service?.preferred_observation_types ?? ["anecdotal", "learning_story", "jotting"]}
        aiDataNoticeAcceptedAt={service?.ai_data_notice_accepted_at ?? null}
        approvedProviderNumber={service?.approved_provider_number ?? null}
        serviceApprovalNumber={service?.service_approval_number ?? null}
        nominatedSupervisorName={service?.nominated_supervisor_name ?? null}
        nominatedSupervisorPhone={service?.nominated_supervisor_phone ?? null}
        nominatedSupervisorEmail={service?.nominated_supervisor_email ?? null}
        materialAlertLeadDays={service?.material_alert_lead_days ?? 14}
        jurisdiction={service?.jurisdiction ?? "national"}
      />

      {myProfile?.media_consent_at && !myProfile.media_consent_withdrawn_at && (
        <div className={`mt-6 p-5 ${cardClass}`}>
          <h2 className="font-display text-sm font-semibold text-ink">Your photo &amp; media consent</h2>
          <p className="mt-1 text-sm text-ink/60">
            You accepted photo/media consent on {new Date(myProfile.media_consent_at).toLocaleDateString("en-AU")}.
          </p>
          <div className="mt-3">
            <WithdrawConsentButton />
          </div>
        </div>
      )}
      {myProfile?.media_consent_withdrawn_at && (
        <div className={`mt-6 p-5 ${cardClass}`}>
          <h2 className="font-display text-sm font-semibold text-ink">Your photo &amp; media consent</h2>
          <p className="mt-1 text-sm text-ink/60">
            You withdrew consent on {new Date(myProfile.media_consent_withdrawn_at).toLocaleDateString("en-AU")}.
          </p>
        </div>
      )}
    </div>
  );
}
