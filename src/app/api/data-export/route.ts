import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { isRateLimited } from "@/lib/rateLimit";

// Full backup/portability export - every table scoped to this service, bundled
// into one downloadable JSON file. Director-only (this includes every child's
// health/medical/incident records, staff compliance numbers, etc. - the same
// sensitivity bar as the rest of the compliance data in the app).
//
// Uses the admin client (bypasses RLS) because a single request fanning out
// to 60+ tables is exactly the kind of broad-but-narrowly-filtered read the
// project's own RLS-vs-security-definer philosophy prefers a service-role
// query for, PROVIDED every query is manually scoped to this caller's own
// owner/educator id below - never trust anything from the request for that
// scoping, only the authenticated session.
//
// Deliberately NOT decrypting FIELD_ENCRYPTION_KEY-protected columns (health
// plan clinical details, additional_needs, staff WWCC numbers) back to
// plaintext here - the export ships them exactly as stored (encrypted or
// legacy-plaintext), so a leaked export file carries the same protection the
// live database already has, rather than becoming a plaintext copy of every
// medical record the moment someone clicks "export."

const OWNER_SCOPED_TABLES = [
  "attendance_records", "audit_log", "behaviour_support_plans", "broadcast_messages",
  "child_attendance_days", "child_contacts", "child_follow_ups", "child_health_plans",
  "child_incident_reports", "child_milestone_observations", "children", "complaint_records",
  "daily_food", "daily_nappy", "daily_routines", "daily_sleep", "environment_safety_checks",
  "excursions", "form_templates", "generated_activities", "invoices", "material_order_alerts",
  "materials", "meal_plans", "medication_administration_log", "nqs_self_assessments",
  "nqs_standard_ratings", "nutrition_education_logs", "observations", "physical_activity_logs",
  "policies", "posters", "programs", "qip_daily_checkins", "qip_items",
  "quality_improvement_plans", "recipes", "risk_assessments", "room_staff_counts", "rooms",
  "safe_work_procedures", "service_closures", "shift_handover_notes", "staff_attendance",
  "staff_compliance", "staff_incident_reports", "staff_leave", "staff_notifications",
  "staff_pd_hours", "staff_reflections", "staff_roster", "transition_statements",
  "visitor_log", "visitors", "waiting_list_enquiries",
] as const;

const EDUCATOR_SCOPED_TABLES = [
  "casual_day_requests", "child_invites", "conversations", "parent_absence_notifications",
  "parent_child_links", "permission_slips", "wall_posts",
] as const;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const role = await getMyStaffRole();
  if (role !== "director") {
    return NextResponse.json({ error: "Only the Director can export the full service data backup" }, { status: 403 });
  }

  // Generous but real limit - this is a heavy multi-table export, not
  // something a script should be able to hammer.
  if (await isRateLimited(`data-export:${user.id}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Export limit reached — try again in an hour" }, { status: 429 });
  }

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return NextResponse.json({ error: "No active service membership" }, { status: 403 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Export is temporarily unavailable — try again shortly" }, { status: 503 });
  }

  const { data: service } = await supabase.from("services").select("name, display_name").eq("director_user_id", ownerUserId).maybeSingle();

  const tables: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  await Promise.all([
    ...OWNER_SCOPED_TABLES.map(async (table) => {
      const { data, error } = await admin.from(table).select("*").eq("owner_user_id", ownerUserId);
      if (error) errors[table] = error.message;
      else tables[table] = data;
    }),
    ...EDUCATOR_SCOPED_TABLES.map(async (table) => {
      const { data, error } = await admin.from(table).select("*").eq("educator_user_id", ownerUserId);
      if (error) errors[table] = error.message;
      else tables[table] = data;
    }),
  ]);

  const exportBody = {
    exportedAt: new Date().toISOString(),
    serviceName: service?.display_name || service?.name || "DR. SparkPlay export",
    note: "This is a full backup of every record your service owns. Health/medical/compliance fields protected by field-level encryption in the live app remain encrypted here, not plaintext.",
    tables,
    ...(Object.keys(errors).length > 0 ? { tableErrors: errors } : {}),
  };

  const filename = `sparkplay-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(exportBody, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
