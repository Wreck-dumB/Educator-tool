import { createClient } from "./server";
import { getMyServiceOwnerId } from "./services";

export type AuditAction =
  | "view_incident_reports"
  | "view_child_record"
  | "view_child_documents"
  | "view_permission_slip_signatures"
  | "export_child_portfolio";

export interface AuditEntry {
  id: string;
  owner_user_id: string;
  actor_user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  created_at: string;
  actor_email?: string;
}

export async function logAuditEvent(
  action: AuditAction,
  target?: { type: string; id: string; label: string },
): Promise<void> {
  try {
    const supabase = await createClient();
    const ownerUserId = await getMyServiceOwnerId();
    if (!ownerUserId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_log").insert({
      owner_user_id: ownerUserId,
      actor_user_id: user.id,
      action,
      target_type: target?.type ?? null,
      target_id: target?.id ?? null,
      target_label: target?.label ?? null,
    });
  } catch {
    // Audit logging is non-critical — never throw to the caller.
  }
}

export async function getAuditLog(limit = 200): Promise<AuditEntry[]> {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return [];

  const { data } = await supabase
    .from("audit_log")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as AuditEntry[];
}
