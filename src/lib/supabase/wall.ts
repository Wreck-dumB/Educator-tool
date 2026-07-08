import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type WallPost = Database["public"]["Tables"]["wall_posts"]["Row"];

export type { WallPost };

export async function getWallPostsForEducator(): Promise<WallPost[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wall_posts")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getApprovedWallPosts(educatorUserId: string): Promise<WallPost[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wall_posts")
    .select("*")
    .eq("educator_user_id", educatorUserId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  return data ?? [];
}
