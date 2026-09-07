import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// Platform-owner "view a centre" snapshot for /owner/businesses/[serviceId].
//
// Deliberately an ALLOWLIST of tables, not a blocklist: the schema has 30+
// domain tables and keeps growing, so trying to remember every child-linked
// table to exclude is fragile. Only the tables below are ever queried here —
// a new table added later doesn't automatically show up in this view; adding
// one is a deliberate, separate decision.
//
// Excluded on purpose (child-linked, per the same convention as
// src/lib/encryption.ts): children, child_contacts, child_health_plans,
// observations, behaviour-support tables, excursions, incident reports,
// medication/handover/visitor logs, casual day requests, waiting list.
// staff_compliance.reference_number (WWCC/cert number, app-layer encrypted)
// is excluded even though the rest of that table is included.
export interface CentreOperationsSnapshot {
  service: {
    id: string;
    name: string;
    displayName: string | null;
    directorUserId: string;
    directorEmail: string;
    jurisdiction: string;
    approvedProviderNumber: string | null;
    serviceApprovalNumber: string | null;
    nominatedSupervisorName: string | null;
    isDemo: boolean;
    createdAt: string;
  };
  staff: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
    removedAt: string | null;
  }>;
  rooms: Array<{ id: string; name: string; capacity: number | null; createdAt: string }>;
  programs: Array<{ id: string; title: string; startDate: string; endDate: string; status: string }>;
  activities: Array<{ id: string; title: string; suggestedTemplate: string | null; createdAt: string }>;
  policies: Array<{ id: string; category: string; title: string; reviewedAt: string | null }>;
  safeWorkProcedures: Array<{ id: string; taskTitle: string; reviewedAt: string | null }>;
  riskAssessments: Array<{ id: string; title: string; reviewedAt: string | null }>;
  staffCompliance: Array<{
    id: string;
    staffUserId: string;
    complianceType: string;
    label: string;
    issuedDate: string | null;
    expiryDate: string | null;
  }>;
}

export async function getCentreOperationsSnapshot(
  admin: SupabaseClient<Database>,
  serviceId: string,
): Promise<CentreOperationsSnapshot | null> {
  const { data: service } = await admin
    .from("services")
    .select(
      "id, name, display_name, director_user_id, jurisdiction, approved_provider_number, service_approval_number, nominated_supervisor_name, is_demo, created_at",
    )
    .eq("id", serviceId)
    .maybeSingle();

  if (!service) return null;

  const ownerUserId = service.director_user_id;

  const [
    directorRes,
    staffRes,
    roomsRes,
    programsRes,
    activitiesRes,
    policiesRes,
    swpRes,
    riskRes,
    complianceRes,
  ] = await Promise.all([
    admin.auth.admin.getUserById(ownerUserId),
    admin
      .from("staff_memberships")
      .select("id, user_id, role, status, created_at, removed_at")
      .eq("service_id", serviceId)
      .order("created_at", { ascending: false }),
    admin
      .from("rooms")
      .select("id, name, capacity, created_at")
      .eq("owner_user_id", ownerUserId)
      .order("sort_order", { ascending: true }),
    admin
      .from("programs")
      .select("id, title, start_date, end_date, status")
      .eq("owner_user_id", ownerUserId)
      .order("start_date", { ascending: false })
      .limit(50),
    admin
      .from("generated_activities")
      .select("id, title, suggested_template, created_at")
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("policies")
      .select("id, category, title, reviewed_at")
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("safe_work_procedures")
      .select("id, task_title, reviewed_at")
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("risk_assessments")
      .select("id, title, reviewed_at")
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("staff_compliance")
      .select("id, staff_user_id, compliance_type, label, issued_date, expiry_date")
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const staffUserIds = (staffRes.data ?? []).map((s) => s.user_id);
  const emailByUserId = new Map<string, string>();
  await Promise.all(
    staffUserIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data?.user?.email) emailByUserId.set(id, data.user.email);
    }),
  );

  return {
    service: {
      id: service.id,
      name: service.name,
      displayName: service.display_name,
      directorUserId: ownerUserId,
      directorEmail: directorRes.data?.user?.email ?? "—",
      jurisdiction: service.jurisdiction,
      approvedProviderNumber: service.approved_provider_number,
      serviceApprovalNumber: service.service_approval_number,
      nominatedSupervisorName: service.nominated_supervisor_name,
      isDemo: service.is_demo,
      createdAt: service.created_at,
    },
    staff: (staffRes.data ?? []).map((s) => ({
      id: s.id,
      email: emailByUserId.get(s.user_id) ?? "—",
      role: s.role,
      status: s.status,
      createdAt: s.created_at,
      removedAt: s.removed_at,
    })),
    rooms: (roomsRes.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      capacity: r.capacity,
      createdAt: r.created_at,
    })),
    programs: (programsRes.data ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      startDate: p.start_date,
      endDate: p.end_date,
      status: p.status,
    })),
    activities: (activitiesRes.data ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      suggestedTemplate: a.suggested_template,
      createdAt: a.created_at,
    })),
    policies: (policiesRes.data ?? []).map((p) => ({
      id: p.id,
      category: p.category,
      title: p.title,
      reviewedAt: p.reviewed_at,
    })),
    safeWorkProcedures: (swpRes.data ?? []).map((s) => ({
      id: s.id,
      taskTitle: s.task_title,
      reviewedAt: s.reviewed_at,
    })),
    riskAssessments: (riskRes.data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      reviewedAt: r.reviewed_at,
    })),
    staffCompliance: (complianceRes.data ?? []).map((c) => ({
      id: c.id,
      staffUserId: c.staff_user_id,
      complianceType: c.compliance_type,
      label: c.label,
      issuedDate: c.issued_date,
      expiryDate: c.expiry_date,
    })),
  };
}
