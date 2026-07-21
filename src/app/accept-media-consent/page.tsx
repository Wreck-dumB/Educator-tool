import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptMediaConsent } from "./actions";

export const metadata: Metadata = { title: "Photo & Media Consent · DR. SparkPlay" };

export default async function AcceptMediaConsentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, media_consent_at")
    .eq("id", user.id)
    .maybeSingle();

  // Already given — don't show the gate again.
  if (profile?.media_consent_at) {
    redirect(profile.role === "parent" ? "/parent" : "/dashboard");
  }

  const isParent = profile?.role === "parent";

  return (
    <>
      <div className="text-center mb-6">
        <span className="font-display text-2xl font-semibold text-coral-dark">DR. SparkPlay</span>
        <h1 className="mt-2 text-xl font-semibold text-ink">Photo &amp; media consent</h1>
        <p className="mt-1 text-sm text-ink/60">
          Please read and accept the following to use the app.
        </p>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-5 space-y-4 text-sm text-ink/80">
        <p>
          DR. SparkPlay is used to document children&apos;s learning and daily experiences, which
          often includes photographs and short videos.
        </p>

        {isParent ? (
          <>
            <Item heading="I consent to my child&apos;s images being used within the service.">
              I consent to photographs and short videos of my child being captured by educators and
              used inside DR. SparkPlay to document their learning and daily experiences — for
              example in observations, learning stories, and the daily diary — and shared with me and
              the authorised educators at my child&apos;s service.
            </Item>
            <Item heading="How images are handled.">
              Images are stored securely within the app and are not used for public marketing,
              social media, or any purpose outside the service without my separate written consent.
            </Item>
            <Item heading="I can change my mind.">
              I understand I can ask questions or withdraw this consent at any time by contacting my
              child&apos;s service.
            </Item>
          </>
        ) : (
          <>
            <Item heading="Children&apos;s images are sensitive and confidential.">
              I understand that photographs and videos of children are sensitive personal
              information belonging to those children and their families.
            </Item>
            <Item heading="I will only use media appropriately.">
              I agree to capture and use children&apos;s photos and videos only within DR. SparkPlay,
              for legitimate educational and family-communication purposes, in line with my
              service&apos;s photo/media policy and the Privacy Act.
            </Item>
            <Item heading="I will not share media outside approved systems.">
              I will never store, send, post, or share children&apos;s images outside the
              service&apos;s approved systems, including on personal devices or social media.
            </Item>
          </>
        )}

        <div className="border-t border-ink/10 pt-4 text-ink/60">
          Media consent version 1.0. This consent is required to use DR. SparkPlay. See our{" "}
          <a href="/privacy" target="_blank" className="text-coral-dark underline">Privacy Policy</a>{" "}
          for how personal information is handled.
        </div>
      </div>

      <form action={acceptMediaConsent} className="mt-5">
        <button
          type="submit"
          className="w-full rounded-2xl bg-coral px-6 py-3 font-semibold text-white hover:bg-coral-dark focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2"
        >
          I understand and accept
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-ink/40">
        Questions?{" "}
        <a href="mailto:support@sparkplay.app" className="underline hover:text-coral-dark">
          support@sparkplay.app
        </a>
      </p>
    </>
  );
}

function Item({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-ink">{heading}</p>
      <p className="mt-1 text-ink/60">{children}</p>
    </div>
  );
}
