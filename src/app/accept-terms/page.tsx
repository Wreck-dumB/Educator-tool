import type { Metadata } from "next";
import Link from "next/link";
import { acceptTerms } from "./actions";

export const metadata: Metadata = { title: "Terms of Service · SparkPlay" };

export default function AcceptTermsPage() {
  return (
    <>
      <div className="text-center mb-6">
        <span className="font-display text-2xl font-semibold text-coral-dark">SparkPlay</span>
        <h1 className="mt-2 text-xl font-semibold text-ink">Before you continue</h1>
        <p className="mt-1 text-sm text-ink/60">Please read and accept the following to use the app.</p>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-5 space-y-4 text-sm text-ink/80">
        <Item heading="SparkPlay is a productivity tool, not a compliance system.">
          It does not provide legal, regulatory, or professional advice. You remain solely
          responsible for your service&apos;s compliance with the Education and Care Services
          National Law, National Regulations, and all applicable legislation.
        </Item>

        <Item heading="Ratio calculations are for reference only.">
          Always verify current ratios with your state or territory regulatory authority.
          Regulations can change after this software was last updated.
        </Item>

        <Item heading="AI-generated content requires your review.">
          Activity suggestions and program drafts are AI-generated and have not been reviewed by
          a qualified educator. Review all AI output for safety, accuracy, and age-appropriateness
          before use.
        </Item>

        <Item heading="Mandatory reporting is your personal legal obligation.">
          No software can decide whether a mandatory report is required. That decision rests
          with you and cannot be delegated to a tool or another person.
        </Item>

        <Item heading="Child records are sensitive and confidential.">
          Incident reports must be kept confidential until the child turns 25 (Regulation 87).
          You are responsible for managing access to your service&apos;s SparkPlay account.
        </Item>

        <div className="border-t border-ink/10 pt-4 text-ink/60">
          By continuing you agree to SparkPlay&apos;s{" "}
          <Link href="/terms" target="_blank" className="text-coral-dark underline">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" target="_blank" className="text-coral-dark underline">Privacy Policy</Link>.
          Terms version 1.0 · Effective 12 July 2026.
        </div>
      </div>

      <form action={acceptTerms} className="mt-5">
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
