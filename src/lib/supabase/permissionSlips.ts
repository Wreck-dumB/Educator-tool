import { createClient } from "@/lib/supabase/server";
import type {
  PermissionSlip,
  PermissionSlipVersion,
  PermissionSlipTarget,
  PermissionSlipSignature,
} from "@/lib/types/domain";

export interface SlipWithDetails extends PermissionSlip {
  currentVersionText: string;
  targets: (PermissionSlipTarget & { childFirstName: string; signature: PermissionSlipSignature | null })[];
}

/** Educator view: every slip they created, with targets/signatures joined. */
export async function getPermissionSlips(): Promise<SlipWithDetails[]> {
  const supabase = await createClient();
  const { data: slips } = await supabase.from("permission_slips").select("*").order("created_at", { ascending: false });
  if (!slips || slips.length === 0) return [];

  const slipIds = slips.map((s) => s.id);
  const [{ data: versions }, { data: targets }, { data: signatures }, { data: children }] = await Promise.all([
    supabase.from("permission_slip_versions").select("*").in("slip_id", slipIds),
    supabase.from("permission_slip_targets").select("*").in("slip_id", slipIds),
    supabase.from("permission_slip_signatures").select("*").in("slip_id", slipIds),
    supabase.from("children").select("id, first_name"),
  ]);

  const childNameById = new Map((children ?? []).map((c) => [c.id, c.first_name]));
  const versionsBySlip = new Map<string, PermissionSlipVersion[]>();
  for (const v of versions ?? []) {
    const existing = versionsBySlip.get(v.slip_id);
    if (existing) existing.push(v);
    else versionsBySlip.set(v.slip_id, [v]);
  }

  return slips.map((slip) => {
    const slipVersions = versionsBySlip.get(slip.id) ?? [];
    const current = slipVersions.find((v) => v.version_number === slip.current_version);
    const slipTargets = (targets ?? []).filter((t) => t.slip_id === slip.id);

    return {
      ...slip,
      currentVersionText: current?.body_text ?? "",
      targets: slipTargets.map((t) => ({
        ...t,
        childFirstName: childNameById.get(t.child_id) ?? "Unknown child",
        signature: (signatures ?? []).find((sig) => sig.slip_id === slip.id && sig.child_id === t.child_id) ?? null,
      })),
    };
  });
}

/** Parent view: slips targeted to any of their linked children, with the version they were actually sent. */
export async function getSlipsForParentChild(childId: string) {
  const supabase = await createClient();
  const { data: targets } = await supabase.from("permission_slip_targets").select("*").eq("child_id", childId);
  if (!targets || targets.length === 0) return [];

  const slipIds = targets.map((t) => t.slip_id);
  const [{ data: slips }, { data: versions }, { data: signatures }] = await Promise.all([
    supabase.from("permission_slips").select("*").in("id", slipIds),
    supabase.from("permission_slip_versions").select("*").in("slip_id", slipIds),
    supabase.from("permission_slip_signatures").select("*").eq("child_id", childId).in("slip_id", slipIds),
  ]);

  return targets.map((target) => {
    const slip = (slips ?? []).find((s) => s.id === target.slip_id);
    const version = (versions ?? []).find(
      (v) => v.slip_id === target.slip_id && v.version_number === target.sent_version_number,
    );
    const signature = (signatures ?? []).find((sig) => sig.slip_id === target.slip_id) ?? null;
    return { target, slip, version, signature };
  });
}
