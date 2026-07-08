import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RoomDailyReportPanel from "@/components/RoomDailyReportPanel";

export default async function RoomDailyReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: room } = await supabase.from("rooms").select("id, name").eq("id", id).single();

  if (!room) notFound();

  return (
    <div className="mx-auto max-w-2xl print:max-w-none">
      <div className="mb-6 print:hidden">
        <Link href="/rooms" className="text-sm text-coral-dark hover:underline">
          ← Rooms
        </Link>
        <h1 className="font-display mt-2 text-3xl font-semibold text-coral-dark">
          {room.name} — Daily Report
        </h1>
      </div>
      <RoomDailyReportPanel roomId={room.id} roomName={room.name} />
    </div>
  );
}
