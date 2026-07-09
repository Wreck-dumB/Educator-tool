"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setRoomCapacity(roomId: string, capacity: number) {
  const supabase = await createClient();
  await supabase.from("rooms").update({ capacity }).eq("id", roomId);
  revalidatePath("/occupancy");
}
