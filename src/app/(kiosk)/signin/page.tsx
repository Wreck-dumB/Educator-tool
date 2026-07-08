import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import {
  getChildrenForSignIn,
  getStaffForSignIn,
  getVisitorsForDate,
} from "@/lib/supabase/signinBoard";
import SignInBoard from "./SignInBoard";

function todayAEST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

export default async function SignInPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/family/setup");

  const today = todayAEST();

  const [children, staff, visitors] = await Promise.all([
    getChildrenForSignIn(today),
    getStaffForSignIn(today, ownerUserId),
    getVisitorsForDate(today, ownerUserId),
  ]);

  return (
    <div className="h-full p-4 md:p-6">
      <SignInBoard
        children={children}
        staff={staff}
        visitors={visitors}
        currentUserId={user.id}
        today={today}
      />
    </div>
  );
}
