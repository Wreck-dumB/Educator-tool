import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy · DR. SparkPlay" };

const EFFECTIVE_DATE = "12 July 2026";
const CONTACT_EMAIL = "privacy@sparkplay.app";

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-ink">
      <Link href="/login" className="text-sm text-coral-dark hover:underline">← Back</Link>

      <h1 className="mt-4 font-display text-4xl font-semibold text-coral-dark">Privacy Policy</h1>
      <p className="mt-1 text-sm text-ink/50">Effective date: {EFFECTIVE_DATE} · Version 1.0</p>

      <p className="mt-6 text-sm text-ink/70">
        DR. SparkPlay (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is an early childhood education tool operated as
        a sole-trader business in Australia. We take privacy seriously, particularly because we handle
        information about children and families. This policy explains what personal information we collect,
        why we collect it, how we protect it, and your rights under the{" "}
        <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles (APPs).
      </p>

      <Section title="1. Who this policy covers">
        <p>This policy applies to:</p>
        <ul>
          <li><strong>Educators and centre staff</strong> who use DR. SparkPlay to manage their service.</li>
          <li><strong>Parents and guardians</strong> linked to a child enrolled at a service using DR. SparkPlay.</li>
          <li><strong>Children</strong> whose records are held in DR. SparkPlay by their educator.</li>
        </ul>
        <p>Children cannot create their own DR. SparkPlay accounts. All child records are created and managed by educators or linked parents.</p>
      </Section>

      <Section title="2. What information we collect">
        <h3 className="mt-4 font-semibold text-ink">2.1 Educator accounts</h3>
        <ul>
          <li>Email address and display name</li>
          <li>Service name and state/territory (jurisdiction)</li>
          <li>Staff role (Director, 2IC, or Staff)</li>
          <li>Date and version of terms acceptance</li>
        </ul>

        <h3 className="mt-4 font-semibold text-ink">2.2 Child records</h3>
        <p>
          Child records are entered by educators or parents. They may include first name, date of birth,
          current interests, immunisation status, enrolment dates, attendance records, room assignment,
          and additional needs information.
        </p>
        <p className="mt-2">
          Observations, learning documentation, generated activity records, and EYLF outcome links are
          associated with child records and may include descriptions of a child&apos;s behaviour, development,
          and wellbeing.
        </p>
        <p className="mt-2">
          Incident reports may include descriptions of injuries, illnesses, traumas, or behavioural
          incidents involving a child. These are{" "}
          <strong>sensitive health information</strong> under the Privacy Act and receive the highest
          level of protection.
        </p>

        <h3 className="mt-4 font-semibold text-ink">2.3 Documents</h3>
        <p>
          Educators and parents may upload documents including immunisation records, medical action plans,
          custody documents, and authorisation letters. These are stored in a private, access-controlled
          file store and are never publicly accessible.
        </p>

        <h3 className="mt-4 font-semibold text-ink">2.4 Parent accounts</h3>
        <ul>
          <li>Email address and display name</li>
          <li>Messages exchanged with the educator</li>
          <li>Permission slip signatures (including typed name and timestamp)</li>
          <li>Wall posts submitted to the service&apos;s community board</li>
        </ul>

        <h3 className="mt-4 font-semibold text-ink">2.5 Usage data</h3>
        <p>
          We maintain an audit log recording which staff members accessed sensitive records (incident
          reports, child records), the time of access, and their role. This log is accessible only to
          the service Director and is used for accountability, not marketing or profiling.
        </p>
      </Section>

      <Section title="3. Why we collect this information">
        <p>We collect personal information only for the following purposes:</p>
        <ul>
          <li>Providing the DR. SparkPlay service to educators and their centres</li>
          <li>Supporting compliance with the <em>Education and Care Services National Law</em> and National Regulations</li>
          <li>Enabling parent-educator communication and family engagement</li>
          <li>Generating EYLF-linked learning documentation</li>
          <li>Maintaining records required by law (e.g., Regulation 87 incident records)</li>
          <li>Security, audit, and fraud prevention</li>
        </ul>
        <p className="mt-2">
          We do not use personal information for marketing, profiling, or sharing with third parties for
          commercial purposes. We do not use children&apos;s information to train AI models.
        </p>
      </Section>

      <Section title="4. How we store and protect information">
        <p>
          All data is stored in Australia using Supabase (hosted on AWS ap-southeast-2, Sydney). All
          connections are encrypted in transit (TLS 1.2+). Data at rest is encrypted by the storage
          provider.
        </p>
        <p className="mt-2">
          Access to data within the app is controlled by row-level security policies enforced at the
          database layer. Staff members can only access records belonging to their own service. Parents
          can only access records for their own linked child.
        </p>
        <p className="mt-2">
          We use Anthropic&apos;s Claude API to generate activity suggestions and staff reflections. Inputs
          sent to the AI may include EYLF outcome codes and generic activity context, but we do not send
          children&apos;s names, dates of birth, incident report content, or health information to the AI.
        </p>
      </Section>

      <Section title="5. How long we keep information">
        <p>We retain information in line with legal requirements:</p>
        <ul>
          <li>
            <strong>Child incident reports</strong> — Regulation 87 requires these records to be kept
            confidential until the child turns 25. DR. SparkPlay retains these records for the duration
            of your subscription and displays the mandatory retention date on each child&apos;s profile.
          </li>
          <li>
            <strong>Attendance records</strong> — 3 years from the date of the record (Regulation 175).
          </li>
          <li>
            <strong>Educator account data</strong> — Retained while your account is active. On account
            deletion, personal account data is removed within 30 days. Service records (incident reports,
            child records) are retained for their legally required period.
          </li>
          <li>
            <strong>Uploaded documents</strong> — Retained until soft-deleted by an authorised educator.
            Hard deletion requires a manual request to us.
          </li>
          <li>
            <strong>Audit log</strong> — 7 years from the date of the entry.
          </li>
        </ul>
      </Section>

      <Section title="6. Sharing information">
        <p>We do not sell personal information. We share information only as follows:</p>
        <ul>
          <li>
            <strong>Within your service</strong> — Educators at your service (Director, 2IC, Staff) can
            access child and attendance records in line with their role.
          </li>
          <li>
            <strong>With linked parents</strong> — Observations shared by an educator, permission slips
            sent to a parent, and educator-parent messages are visible to the relevant parent.
          </li>
          <li>
            <strong>Service providers</strong> — We use Supabase (data storage), Anthropic (AI generation),
            and Vercel (hosting). Each is a contracted processor; none may use your data independently.
          </li>
          <li>
            <strong>Legal obligations</strong> — We may disclose information if required by law, court
            order, or to prevent serious harm.
          </li>
        </ul>
      </Section>

      <Section title="7. Your rights">
        <p>Under the Australian Privacy Principles you have the right to:</p>
        <ul>
          <li><strong>Access</strong> the personal information we hold about you</li>
          <li><strong>Correct</strong> inaccurate or out-of-date information</li>
          <li><strong>Complain</strong> about a breach of the APPs</li>
        </ul>
        <p className="mt-2">
          To exercise these rights, contact us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-coral-dark underline">{CONTACT_EMAIL}</a>.
          We will respond within 30 days.
        </p>
        <p className="mt-2">
          If you are not satisfied with our response, you may lodge a complaint with the{" "}
          <a
            href="https://www.oaic.gov.au/privacy/privacy-complaints"
            target="_blank"
            rel="noopener noreferrer"
            className="text-coral-dark underline"
          >
            Office of the Australian Information Commissioner (OAIC)
          </a>.
        </p>
      </Section>

      <Section title="8. Notifiable data breaches">
        <p>
          If we become aware of a data breach that is likely to result in serious harm, we will notify
          affected individuals and the OAIC as required under the Notifiable Data Breaches scheme
          (Part IIIC of the Privacy Act 1988).
        </p>
      </Section>

      <Section title="9. Children&rsquo;s privacy">
        <p>
          We are aware that child information is particularly sensitive. Children cannot create DR. SparkPlay
          accounts. All child records are created by educators or linked parents and are subject to
          role-based access controls. Child health information (immunisation records, incident reports,
          medical action plans) is treated as sensitive information and is never used for any purpose
          other than providing the service to the child&apos;s educator and authorised family members.
        </p>
      </Section>

      <Section title="10. Changes to this policy">
        <p>
          We may update this policy from time to time. When we do, we will update the effective date
          above and, for material changes, notify active users by email. Continued use of DR. SparkPlay
          after a change constitutes acceptance of the updated policy.
        </p>
      </Section>

      <Section title="11. Contact us">
        <p>
          DR. SparkPlay is operated as a sole-trader business in Australia.
          For privacy enquiries: <a href={`mailto:${CONTACT_EMAIL}`} className="text-coral-dark underline">{CONTACT_EMAIL}</a>
        </p>
      </Section>

      <div className="mt-10 border-t border-ink/10 pt-6 flex gap-4 text-sm text-ink/50">
        <Link href="/terms" className="hover:text-coral-dark hover:underline">Terms of Service</Link>
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
