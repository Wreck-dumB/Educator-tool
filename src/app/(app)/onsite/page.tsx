import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getOnsiteData, getRatioData } from "@/lib/supabase/signinBoard";
import OnsiteBoard from "./OnsiteBoard";

function todayAEST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

export default async function OnsitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/family/setup");

  const today = todayAEST();

  const [onsite, ratioData] = await Promise.all([
    getOnsiteData(today, ownerUserId),
    getRatioData(today, ownerUserId),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <OnsiteBoard
        children={onsite.children}
        staff={onsite.staff}
        visitors={onsite.visitors}
        rooms={onsite.rooms}
        ratioRooms={ratioData.rooms}
        totalSignedInStaff={ratioData.totalSignedInStaff}
        today={today}
      />
    </div>
  );
}
