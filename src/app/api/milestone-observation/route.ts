import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return NextResponse.json({ error: "No active service" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const { childId, milestoneId, customMilestoneText, observedAt, notes } = body ?? {};

  if (!childId || typeof childId !== "string") {
    return NextResponse.json({ error: "Missing childId" }, { status: 400 });
  }
  if (!milestoneId && (!customMilestoneText || typeof customMilestoneText !== "string")) {
    return NextResponse.json({ error: "milestoneId or customMilestoneText required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("child_milestone_observations")
    .insert({
      owner_user_id: ownerUserId,
      child_id: childId,
      milestone_id: milestoneId ?? null,
      custom_milestone_text: customMilestoneText ?? null,
      observed_at: observedAt ?? new Date().toISOString().slice(0, 10),
      notes: notes ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await supabase.from("child_milestone_observations").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
