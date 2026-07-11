import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service · SparkPlay" };

const EFFECTIVE_DATE = "12 July 2026";
const CONTACT_EMAIL = "support@sparkplay.app";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-ink">
      <Link href="/login" className="text-sm text-coral-dark hover:underline">← Back</Link>

      <h1 className="mt-4 font-display text-4xl font-semibold text-coral-dark">Terms of Service</h1>
      <p className="mt-1 text-sm text-ink/50">Effective date: {EFFECTIVE_DATE} · Version 1.0</p>

      <p className="mt-6 text-sm text-ink/70">
        These terms govern your use of SparkPlay. By creating an account or clicking &ldquo;I accept&rdquo;,
        you agree to these terms. Please read them carefully.
      </p>

      <Section title="1. What SparkPlay is">
        <p>
          SparkPlay is a productivity tool for early childhood educators. It helps you draft
          EYLF-linked learning programs, log observations, manage attendance, and maintain
          administrative records.
        </p>
        <p className="mt-2 font-semibold text-amber-800">
          SparkPlay is a tool, not a compliance advisor. It does not provide legal, regulatory,
          or professional advice, and does not guarantee that your service meets any particular
          legislative or quality standard.
        </p>
        <p className="mt-2">
          You remain solely responsible for your service&apos;s compliance with the{" "}
          <em>Education and Care Services National Law</em>, National Regulations, the National
          Quality Standard, and any applicable state or territory legislation.
        </p>
      </Section>

      <Section title="2. Your account">
        <p>
          You must provide accurate information when creating your account. You are responsible
          for keeping your credentials secure. Notify us immediately at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-coral-dark underline">{CONTACT_EMAIL}</a>{" "}
          if you believe your account has been compromised.
        </p>
        <p className="mt-2">
          Accounts are personal to individual educators. You may not share login credentials
          with other people. Each educator at your service should have their own account.
        </p>
      </Section>

      <Section title="3. Data you enter">
        <p>
          You retain ownership of all data you enter into SparkPlay, including child records,
          observations, programs, and documents. We do not claim any intellectual property rights
          over your data.
        </p>
        <p className="mt-2">
          You are responsible for ensuring that any personal information you enter about children
          or families has been collected lawfully and with appropriate consent. SparkPlay stores
          this data on your behalf but does not independently verify its accuracy or legality.
        </p>
      </Section>

      <Section title="4. AI-generated content">
        <p>
          SparkPlay uses AI (Anthropic&apos;s Claude) to generate activity suggestions, learning
          program drafts, and staff reflection prompts. This content is generated automatically
          and has not been reviewed by a qualified educator or regulatory expert.
        </p>
        <p className="mt-2">
          You must review all AI-generated content before using it. In particular:
        </p>
        <ul>
          <li>EYLF outcome links suggested by the AI should be verified against the EYLF V2.0 before use in documentation.</li>
          <li>Activity suggestions should be assessed for safety and age-appropriateness before being offered to children.</li>
          <li>AI-generated text should not be submitted to regulatory authorities without independent review.</li>
        </ul>
      </Section>

      <Section title="5. Regulatory accuracy">
        <p>
          SparkPlay displays educator-to-child ratios based on the{" "}
          <em>Education and Care Services National Regulations 2011</em> and known state/territory
          overrides. These ratios are provided for reference only.
        </p>
        <p className="mt-2 font-semibold text-amber-800">
          Regulations change. Always verify current ratios with your state or territory regulatory
          authority before relying on them. SparkPlay accepts no liability for ratio calculations
          that are incorrect due to regulatory changes made after the software was last updated.
        </p>
        <p className="mt-2">
          Similarly, mandatory reporting legislation citations and other regulatory references in
          SparkPlay are provided for convenience only and may not reflect the most current law.
          Verify with your state authority.
        </p>
      </Section>

      <Section title="6. Mandatory reporting">
        <p>
          SparkPlay includes a mandatory reporting reference section on the incident reports page.
          This is informational only.
        </p>
        <p className="mt-2 font-semibold text-amber-800">
          Whether to make a mandatory report to a child protection authority is your personal
          professional and legal obligation. This obligation cannot be delegated to software,
          a supervisor, or another staff member. SparkPlay does not determine whether any specific
          situation requires a mandatory report.
        </p>
      </Section>

      <Section title="7. Permission slip e-signatures">
        <p>
          Parent signatures collected through SparkPlay&apos;s permission slip feature are electronic
          signatures consisting of a typed name, timestamp, and checkbox affirmation. These satisfy
          the requirements of the{" "}
          <em>Electronic Transactions Act 1999</em> (Cth) for routine consent (photo/media consent,
          general excursion consent).
        </p>
        <p className="mt-2 font-semibold text-amber-800">
          For high-stakes consents such as medication authorisation, you should confirm with your
          service&apos;s insurer and regulatory authority whether an electronic signature satisfies their
          specific requirements before relying on it.
        </p>
      </Section>

      <Section title="8. Child records and confidentiality">
        <p>
          Child incident report records must be kept confidential until the child turns 25, in
          accordance with Regulation 87. You are responsible for ensuring that access to these
          records within your service is appropriately restricted.
        </p>
        <p className="mt-2">
          SparkPlay&apos;s role-based access controls are designed to assist with this obligation, but
          you remain responsible for managing who has access to your SparkPlay account and for
          ensuring your service&apos;s data handling practices meet regulatory requirements.
        </p>
      </Section>

      <Section title="9. Acceptable use">
        <p>You must not use SparkPlay to:</p>
        <ul>
          <li>Store information about children or families you do not have a lawful basis to collect</li>
          <li>Share login credentials or grant access to people who are not employed at your service</li>
          <li>Attempt to access another service&apos;s data</li>
          <li>Upload malicious files or attempt to compromise the security of the platform</li>
          <li>Use the AI generation features to produce content that is discriminatory, harmful, or unlawful</li>
        </ul>
      </Section>

      <Section title="10. Availability and data loss">
        <p>
          We aim to keep SparkPlay available at all times, but we do not guarantee uninterrupted
          access. We recommend that you export and retain your own copies of critical records
          (incident reports, enrolment records) in accordance with your legal obligations — do not
          rely on SparkPlay as your sole record-keeping system.
        </p>
      </Section>

      <Section title="11. Limitation of liability">
        <p>
          To the maximum extent permitted by Australian law, SparkPlay&apos;s liability for any loss
          or damage arising from your use of the service is limited to the amount you paid for
          SparkPlay in the 12 months preceding the claim, or $100 AUD, whichever is greater.
        </p>
        <p className="mt-2">
          We are not liable for losses arising from: regulatory non-compliance, incorrect AI-generated
          content you chose to rely on, data entered inaccurately by you or your staff, or events
          outside our reasonable control.
        </p>
        <p className="mt-2">
          Nothing in these terms excludes rights under the{" "}
          <em>Australian Consumer Law</em> (Schedule 2 of the{" "}
          <em>Competition and Consumer Act 2010</em>) that cannot be excluded by contract.
        </p>
      </Section>

      <Section title="12. Changes to these terms">
        <p>
          We may update these terms. When we do, we will update the effective date above and notify
          active users by email at least 14 days before material changes take effect. Continued use
          after the effective date constitutes acceptance of the updated terms.
        </p>
      </Section>

      <Section title="13. Governing law">
        <p>
          These terms are governed by the laws of New South Wales, Australia. Any disputes will be
          subject to the exclusive jurisdiction of the courts of New South Wales.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>
          Questions about these terms:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-coral-dark underline">{CONTACT_EMAIL}</a>
        </p>
      </Section>

      <div className="mt-10 border-t border-ink/10 pt-6 flex gap-4 text-sm text-ink/50">
        <Link href="/privacy" className="hover:text-coral-dark hover:underline">Privacy Policy</Link>
        <Link href="/login" className="hover:text-coral-dark hover:underline">Back to app</Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-semibold text-coral-dark">{title}</h2>
      <div className="mt-2 space-y-2 text-sm text-ink/80 [&_ul]:ml-5 [&_ul]:mt-1 [&_ul]:list-disc [&_ul]:space-y-1 [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}
