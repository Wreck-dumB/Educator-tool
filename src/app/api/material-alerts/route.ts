import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, materialOrderAlertEmail } from "@/lib/email";
import { getMaterialStatuses, itemsToSource } from "@/lib/materialsMatch";
import type { Material } from "@/lib/types/domain";

// Called by Vercel Cron (Authorization: Bearer <CRON_SECRET>) or manually.
// Creates in-app staff_notifications AND sends Resend emails to director + 2IC.
// Requires SUPABASE_SERVICE_ROLE_KEY and optionally RESEND_API_KEY.

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Admin client not configured (SUPABASE_SERVICE_ROLE_KEY missing)" }, { status: 503 });
  }

  // Run the in-app notification function directly (also handles dedup)
  const { data: rpcResult } = await supabase.rpc("process_material_order_alerts");

  // --- Email sending ---
  // For each service that has materials to source, email director + 2IC.
  const { data: services } = await supabase
    .from("services")
    .select("id, director_user_id, name, material_alert_lead_days");

  let emailsSent = 0;

  for (const svc of services ?? []) {
    const leadDays = svc.material_alert_lead_days ?? 14;
    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date(Date.now() + leadDays * 86400000).toISOString().slice(0, 10);

    // Get upcoming entries with activities
    const { data: entries } = await supabase
      .from("program_entries")
      .select("activity_id, programs!inner(owner_user_id)")
      .eq("programs.owner_user_id", svc.director_user_id)
      .not("activity_id", "is", null)
      .gt("day_date", today)
      .lte("day_date", horizon);

    if (!entries || entries.length === 0) continue;

    const activityIds = [...new Set(entries.map((e) => e.activity_id!))];

    const { data: activities } = await supabase
      .from("generated_activities")
      .select("materials_used")
      .in("id", activityIds);

    const allMaterialNames = [
      ...new Set((activities ?? []).flatMap((a) => a.materials_used ?? [])),
    ];
    if (allMaterialNames.length === 0) continue;

    const { data: inventoryRows } = await supabase
      .from("materials")
      .select("*")
      .eq("owner_user_id", svc.director_user_id);

    const inventory = (inventoryRows ?? []) as Material[];
    const statuses = getMaterialStatuses(allMaterialNames, inventory);
    const toSource = itemsToSource(statuses);
    if (toSource.length === 0) continue;

    const notInInventory = toSource.filter((s) => s.status === "not_in_inventory").map((s) => s.name);
    const lowStock = toSource.filter((s) => s.status === "low_stock").map((s) => s.name);

    // Get director + 2IC emails
    const { data: members } = await supabase
      .from("staff_memberships")
      .select("user_id, role")
      .eq("service_id", svc.id)
      .eq("status", "active")
      .in("role", ["director", "2ic"]);

    if (!members || members.length === 0) continue;

    const userIds = members.map((m) => m.user_id);
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const emailById = new Map((users ?? []).map((u) => [u.id, u.email ?? ""]));

    for (const member of members) {
      const email = emailById.get(member.user_id);
      if (!email) continue;

      await sendEmail(
        materialOrderAlertEmail({
          to: email,
          serviceName: svc.name,
          notInInventory,
          lowStock,
          leadDays,
          horizon,
        }),
      );
      emailsSent++;
    }
  }

  return NextResponse.json({
    ok: true,
    inAppResult: rpcResult,
    emailsSent,
  });
}
