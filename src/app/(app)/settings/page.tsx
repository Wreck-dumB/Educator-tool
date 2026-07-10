import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyStaffRole } from "@/lib/supabase/staff";
import SettingsClient from "./SettingsClient";

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
    .select("name, display_name, logo_path, preferred_observation_types, ai_data_notice_accepted_at, approved_provider_number, service_approval_number, nominated_supervisor_name, nominated_supervisor_phone, nominated_supervisor_email")
    .maybeSingle();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const logoUrl = service?.logo_path
    ? `${supabaseUrl}/storage/v1/object/public/service-logos/${service.logo_path}`
    : null;

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
      />
    </div>
  );
}
