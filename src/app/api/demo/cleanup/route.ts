import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteDemoAccount } from "@/lib/demoSeed";

// Called by Vercel Cron (Authorization: Bearer <CRON_SECRET>). Removes public
// demo centres (see /api/demo/start) older than 48 hours so they don't pile
// up. Real (non-demo) centres are never touched -- filtered on is_demo=true.
const DEMO_LIFETIME_MS = 48 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });
  }

  const cutoff = new Date(Date.now() - DEMO_LIFETIME_MS).toISOString();
  const { data: expired, error } = await admin
    .from("services")
    .select("director_user_id")
    .eq("is_demo", true)
    .lt("created_at", cutoff);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let deleted = 0;
  const failures: string[] = [];
  for (const row of expired ?? []) {
    try {
      await deleteDemoAccount(admin, row.director_user_id);
      deleted++;
    } catch (err) {
      failures.push(`${row.director_user_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, deleted, failures });
}
