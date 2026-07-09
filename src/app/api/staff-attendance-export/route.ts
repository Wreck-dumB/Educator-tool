import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells
    .map((c) => {
      const s = c == null ? "" : String(c);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    })
    .join(",");
}

function aestTime(isoStr: string | null): string {
  if (!isoStr) return "";
  return new Date(isoStr).toLocaleTimeString("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return NextResponse.json({ error: "No active service" }, { status: 403 });

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "from and to date params required (YYYY-MM-DD)" }, { status: 400 });
  }

  if (from > to) {
    return NextResponse.json({ error: "from must be before to" }, { status: 400 });
  }

  const { data: service } = await supabase.from("services").select("id, name").maybeSingle();
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  const [{ data: attendance }, { data: memberships }, { data: profiles }] = await Promise.all([
    supabase
      .from("staff_attendance")
      .select("user_id, date, signed_in_at, signed_out_at")
      .eq("owner_user_id", ownerUserId)
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("signed_in_at"),
    supabase
      .from("staff_memberships")
      .select("user_id, role")
      .eq("service_id", service.id),
    supabase
      .from("profiles")
      .select("id, display_name"),
  ]);

  const roleByUser = new Map((memberships ?? []).map((m) => [m.user_id, m.role]));
  const nameByUser = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  const rows: string[] = [
    csvRow(["Date", "Staff Name", "Role", "Sign-in Time (AEST)", "Sign-out Time (AEST)", "Hours Worked"]),
  ];

  for (const row of attendance ?? []) {
    const name = nameByUser.get(row.user_id) ?? row.user_id;
    const role = roleByUser.get(row.user_id) ?? "";
    const signIn = aestTime(row.signed_in_at);
    const signOut = aestTime(row.signed_out_at);

    let hours = "";
    if (row.signed_in_at && row.signed_out_at) {
      const diffMs = new Date(row.signed_out_at).getTime() - new Date(row.signed_in_at).getTime();
      const diffH = diffMs / (1000 * 60 * 60);
      hours = diffH.toFixed(2);
    }

    rows.push(csvRow([row.date, name, role, signIn, signOut, hours]));
  }

  const csv = rows.join("\r\n") + "\r\n";
  const filename = `staff-attendance-${from}-to-${to}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
