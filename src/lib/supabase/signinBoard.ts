import { createClient } from "@/lib/supabase/server";

export interface ChildSignInRow {
  id: string;
  first_name: string;
  date_of_birth: string | null;
  room_id: string | null;
  room_name: string | null;
  attendance_status: "signed_in" | "signed_out" | "absent" | null;
  signed_in_at: string | null;
  signed_out_at: string | null;
  signed_in_by: string | null;
}

export interface StaffSignInRow {
  user_id: string;
  display_name: string;
  role: string;
  signed_in_at: string | null;
  signed_out_at: string | null;
  attendance_id: string | null;
}

export interface VisitorSignInRow {
  id: string;
  name: string;
  company: string | null;
  reason: string;
  signed_in_at: string;
  signed_out_at: string | null;
}

export interface RoomRatioRow {
  room_id: string | null;
  room_name: string;
  children: {
    id: string;
    first_name: string;
    date_of_birth: string | null;
  }[];
  manual_staff_count: number;
  signed_in_staff_count: number;
}

export async function getChildrenForSignIn(date: string): Promise<ChildSignInRow[]> {
  const supabase = await createClient();

  const { data: children } = await supabase
    .from("children")
    .select("id, first_name, date_of_birth, room_id")
    .order("first_name");

  if (!children || children.length === 0) return [];

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name");

  const { data: attendance } = await supabase
    .from("attendance_records")
    .select("child_id, status, signed_in_at, signed_out_at, signed_in_by")
    .eq("date", date);

  const roomById = new Map((rooms ?? []).map((r) => [r.id, r.name]));
  const attendanceByChild = new Map(
    (attendance ?? []).map((a) => [a.child_id, a])
  );

  return children.map((c) => {
    const att = attendanceByChild.get(c.id);
    return {
      id: c.id,
      first_name: c.first_name,
      date_of_birth: c.date_of_birth,
      room_id: c.room_id,
      room_name: c.room_id ? (roomById.get(c.room_id) ?? null) : null,
      attendance_status: (att?.status ?? null) as ChildSignInRow["attendance_status"],
      signed_in_at: att?.signed_in_at ?? null,
      signed_out_at: att?.signed_out_at ?? null,
      signed_in_by: att?.signed_in_by ?? null,
    };
  });
}

export async function getStaffForSignIn(date: string, ownerUserId: string): Promise<StaffSignInRow[]> {
  const supabase = await createClient();

  const { data: service } = await supabase
    .from("services")
    .select("id")
    .maybeSingle();
  if (!service) return [];

  const { data: memberships } = await supabase
    .from("staff_memberships")
    .select("user_id, role")
    .eq("service_id", service.id)
    .eq("status", "active")
    .order("created_at");

  if (!memberships || memberships.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", memberships.map((m) => m.user_id));

  const { data: attendance } = await supabase
    .from("staff_attendance")
    .select("id, user_id, signed_in_at, signed_out_at")
    .eq("owner_user_id", ownerUserId)
    .eq("date", date);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  const attByUser = new Map((attendance ?? []).map((a) => [a.user_id, a]));

  return memberships.map((m) => {
    const att = attByUser.get(m.user_id);
    return {
      user_id: m.user_id,
      display_name: profileById.get(m.user_id) ?? "Unknown",
      role: m.role,
      signed_in_at: att?.signed_in_at ?? null,
      signed_out_at: att?.signed_out_at ?? null,
      attendance_id: att?.id ?? null,
    };
  });
}

export async function getVisitorsForDate(date: string, ownerUserId: string): Promise<VisitorSignInRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("visitors")
    .select("id, name, company, reason, signed_in_at, signed_out_at")
    .eq("owner_user_id", ownerUserId)
    .eq("date", date)
    .order("signed_in_at");
  return (data ?? []) as VisitorSignInRow[];
}

export async function getOnsiteData(date: string, ownerUserId: string) {
  const supabase = await createClient();

  const [childrenRes, staffRes, visitorsRes] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("child_id, signed_in_at")
      .eq("owner_user_id", ownerUserId)
      .eq("date", date)
      .eq("status", "signed_in"),
    supabase
      .from("staff_attendance")
      .select("user_id, signed_in_at")
      .eq("owner_user_id", ownerUserId)
      .eq("date", date)
      .is("signed_out_at", null),
    supabase
      .from("visitors")
      .select("id, name, company, reason, signed_in_at")
      .eq("owner_user_id", ownerUserId)
      .eq("date", date)
      .is("signed_out_at", null),
  ]);

  const signedInChildIds = new Set((childrenRes.data ?? []).map((r) => r.child_id));
  const signedInStaffIds = new Set((staffRes.data ?? []).map((r) => r.user_id));
  const signedInAtByChild = new Map((childrenRes.data ?? []).map((r) => [r.child_id, r.signed_in_at]));
  const signedInAtByStaff = new Map((staffRes.data ?? []).map((r) => [r.user_id, r.signed_in_at]));

  const { data: children } = await supabase
    .from("children")
    .select("id, first_name, date_of_birth, room_id, is_anaphylaxis_risk, medical_conditions, dietary_restrictions, additional_needs")
    .in("id", [...signedInChildIds]);

  const { data: rooms } = await supabase.from("rooms").select("id, name");
  const roomById = new Map((rooms ?? []).map((r) => [r.id, r.name]));

  const { data: service } = await supabase.from("services").select("id").maybeSingle();
  let staffList: { user_id: string; display_name: string; role: string; signed_in_at: string }[] = [];
  if (service) {
    const { data: memberships } = await supabase
      .from("staff_memberships")
      .select("user_id, role")
      .eq("service_id", service.id)
      .eq("status", "active")
      .in("user_id", [...signedInStaffIds]);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", (memberships ?? []).map((m) => m.user_id));

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
    staffList = (memberships ?? []).map((m) => ({
      user_id: m.user_id,
      display_name: profileById.get(m.user_id) ?? "Unknown",
      role: m.role,
      signed_in_at: signedInAtByStaff.get(m.user_id) ?? "",
    }));
  }

  return {
    children: (children ?? []).map((c) => ({
      ...c,
      room_name: c.room_id ? (roomById.get(c.room_id) ?? null) : null,
      signed_in_at: signedInAtByChild.get(c.id) ?? "",
    })),
    staff: staffList,
    visitors: (visitorsRes.data ?? []) as VisitorSignInRow[],
    rooms: (rooms ?? []),
  };
}

export async function getRatioData(date: string, ownerUserId: string) {
  const supabase = await createClient();

  const { data: attendance } = await supabase
    .from("attendance_records")
    .select("child_id")
    .eq("owner_user_id", ownerUserId)
    .eq("date", date)
    .eq("status", "signed_in");

  const signedInIds = new Set((attendance ?? []).map((r) => r.child_id));

  const { data: children } = await supabase
    .from("children")
    .select("id, first_name, date_of_birth, room_id")
    .in("id", [...signedInIds]);

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, sort_order")
    .order("sort_order");

  const { data: roomCounts } = await supabase
    .from("room_staff_counts")
    .select("room_id, staff_count")
    .eq("owner_user_id", ownerUserId)
    .eq("date", date);

  const { data: staffAttendance } = await supabase
    .from("staff_attendance")
    .select("user_id")
    .eq("owner_user_id", ownerUserId)
    .eq("date", date)
    .is("signed_out_at", null);

  const staffCountByRoom = new Map((roomCounts ?? []).map((rc) => [rc.room_id, rc.staff_count]));
  const totalSignedInStaff = (staffAttendance ?? []).length;

  const childrenByRoom = new Map<string | null, typeof children>([[null, []]]);
  (rooms ?? []).forEach((r) => childrenByRoom.set(r.id, []));
  (children ?? []).forEach((c) => {
    const key = c.room_id ?? null;
    if (!childrenByRoom.has(key)) childrenByRoom.set(key, []);
    childrenByRoom.get(key)!.push(c);
  });

  const result: RoomRatioRow[] = [];

  (rooms ?? []).forEach((r) => {
    const roomChildren = childrenByRoom.get(r.id) ?? [];
    if (roomChildren.length === 0) return;
    result.push({
      room_id: r.id,
      room_name: r.name,
      children: roomChildren.sort((a, b) => {
        if (!a.date_of_birth) return 1;
        if (!b.date_of_birth) return -1;
        return a.date_of_birth.localeCompare(b.date_of_birth);
      }),
      manual_staff_count: staffCountByRoom.get(r.id) ?? 0,
      signed_in_staff_count: totalSignedInStaff,
    });
  });

  const unassigned = childrenByRoom.get(null) ?? [];
  if (unassigned.length > 0) {
    result.push({
      room_id: null,
      room_name: "Unassigned",
      children: unassigned.sort((a, b) => {
        if (!a.date_of_birth) return 1;
        if (!b.date_of_birth) return -1;
        return a.date_of_birth.localeCompare(b.date_of_birth);
      }),
      manual_staff_count: 0,
      signed_in_staff_count: totalSignedInStaff,
    });
  }

  return { rooms: result, totalSignedInStaff };
}
