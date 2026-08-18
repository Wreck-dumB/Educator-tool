"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { sendEmail } from "@/lib/email";

export async function acceptMediaConsent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("accept_media_consent", { _version: "1.0" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  redirect(profile?.role === "parent" ? "/parent" : "/dashboard");
}

// Deliberately record-only, not access-revoking — see migration 0064 for why.
// Notifies the Director by email so an actual human follows up (e.g. stops
// taking that family's photos going forward); doesn't unilaterally change
// any technical access or delete existing data.
export async function withdrawMediaConsent(): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase.rpc("withdraw_media_consent");
  if (error) return { error: "Couldn't record your withdrawal — please try again or contact the service directly." };

  // Best-effort notification — never let email trouble undo/hide the
  // withdrawal itself, which is already recorded at this point regardless.
  try {
    const ownerUserId = await getMyServiceOwnerId();
    if (ownerUserId) {
      const admin = createAdminClient();
      const { data: directorAuth } = await admin.auth.admin.getUserById(ownerUserId);
      const directorEmail = directorAuth.user?.email;
      if (directorEmail) {
        await sendEmail({
          to: directorEmail,
          subject: "Photo/media consent withdrawn",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="color:#E8614A;margin-bottom:8px">Photo/media consent withdrawn</h2>
              <p style="color:#444;line-height:1.6">
                <strong>${profile?.display_name ?? user.email ?? "A user"}</strong> has withdrawn their
                photo/media consent on DR. SparkPlay (recorded ${new Date().toLocaleDateString("en-AU")}).
                Please follow up directly — this only records the request, it does not automatically
                change anything else in the app.
              </p>
            </div>`,
        });
      }
    }
  } catch (err) {
    console.error("Consent withdrawal notification email failed (withdrawal itself still recorded):", err);
  }

  revalidatePath("/parent/file");
  revalidatePath("/settings");
  return { success: true };
}
