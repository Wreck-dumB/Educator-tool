import { createClient } from "@/lib/supabase/server";
import type { Room, RoomStaffCount } from "@/lib/types/domain";

export async function getRooms(): Promise<Room[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rooms")
    .select("*")
    .order("sort_order")
    .order("created_at");
  return data ?? [];
}

export async function getRoomStaffCountsForDate(date: string): Promise<RoomStaffCount[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("room_staff_counts")
    .select("*")
    .eq("date", date);
  return data ?? [];
}
