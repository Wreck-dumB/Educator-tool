import { createClient } from "@/lib/supabase/server";

export interface StaffNotification {
  id: string;
  type: "material_order_alert";
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
}

export async function getUnreadStaffNotifications(): Promise<StaffNotification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_notifications")
    .select("id, type, title, body, href, read_at, created_at")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as StaffNotification[];
}

export async function markStaffNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = await createClient();
  await supabase
    .from("staff_notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids);
}
