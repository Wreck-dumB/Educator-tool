"use client";

import Link from "next/link";
import { useState } from "react";

export default function FAQPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const faqs = [
    {
      category: "Getting Started",
      questions: [
        {
          q: "What is DR. SparkPlay?",
          a: "DR. SparkPlay is an all-in-one platform for Australian early learning centres. It handles sign-in, observations, programming, compliance, family communication, and invoicing — with AI assistance built in to reduce paperwork. The DR. stands for Daniel Rust, who built it (it's also a doctor joke).",
        },
        {
          q: "Do I need a credit card to try it?",
          a: "No. Your first 7 days are completely free, with all features included. No credit card required to start.",
        },
        {
          q: "How long does setup take?",
          a: "About 5 minutes. We'll ask for your centre name, roll capacity, and staff count, then generate default settings. You can customise everything after that.",
        },
        {
          q: "Can I use it on a tablet or iPad?",
          a: "Yes. SparkPlay is a PWA (Progressive Web App), so it works on phones, tablets, and computers. It also works offline for core features like kiosk sign-in.",
        },
      ],
    },
    {
      category: "Security & Privacy",
      questions: [
        {
          q: "Is my data secure?",
          a: "Yes. All data is encrypted in transit (HTTPS) and at rest (AES-256-GCM encryption). Role-based access control means staff can only see what they need to, and we maintain audit trails of every data access for compliance.",
        },
        {
          q: "Is it compliant with Australian privacy law?",
          a: "Yes. We comply with the Privacy Act 1988 and follow the Australian Privacy Principles. Medical records and sensitive fields are encrypted separately. Parents can request their data at any time.",
        },
        {
          q: "Who can see what?",
          a: "Each role has different access. Directors see everything. Educators see their assigned children and observations. Staff see only the children they're responsible for. Parents see only their own child's information. All access is logged.",
        },
        {
          q: "Can I export my data?",
          a: "Yes. Observations, children profiles, and compliance records export to PDF or CSV anytime. If you ever leave SparkPlay, your data is yours.",
        },
      ],
    },
    {
      category: "Features & Functionality",
      questions: [
        {
          q: "What do you mean by 'AI assistance'?",
          a: "Our AI (powered by Claude) helps with writing tasks that educators don't have time for: drafting activities from materials on hand, expanding observation notes into full EYLF-linked write-ups, generating policy templates, and personalising activities based on child interests. You always approve before saving. AI is a tool, not a replacement for educator judgment.",
        },
        {
          q: "Does it handle all 8 states and territories?",
          a: "Yes. NQF, EYLF, and state-specific regulations are all built in. Ratios, mandatory reporting, immunisation rules, and compliance requirements vary by state, and SparkPlay knows them all. You can set your state when you sign up.",
        },
        {
          q: "What about CCS (Child Care Subsidy)?",
          a: "SparkPlay includes a CCS estimator so you can work out what a family will likely receive based on their fee, hours, and CCS percentage. It doesn't yet connect directly to Services Australia for automated subsidy claims — that's on the roadmap.",
        },
        {
          q: "Can families see their child's photos and observations?",
          a: "Yes. Photos and observations are shared with parents instantly (you control who sees what). Observations are automatically translated into the family's preferred language (15 languages supported). EYLF links are included so parents understand the learning.",
        },
        {
          q: "Does it work offline?",
          a: "Core features do (kiosk sign-in, observations, activity drafting). Full sync happens when you're back online. This is especially useful for centres with spotty internet.",
        },
        {
          q: "How many children and staff can I have?",
          a: "No hard limits. Pricing is per centre, not per child or staff member. One invoice covers your whole operation.",
        },
      ],
    },
    {
      category: "Pricing & Billing",
      questions: [
        {
          q: "How much does it cost?",
          a: "Plans start at $59/month (Starter), $89/month (Standard), and $129/month (Premium), each with a monthly AI-credit allowance that scales with the plan. No setup fees.",
        },
        {
          q: "Can I cancel anytime?",
          a: "Yes. No long-term contracts — manage or cancel your subscription anytime from your account's billing settings.",
        },
        {
          q: "Do you offer discounts for multiple centres?",
          a: "Yes. If you run more than one centre, we'll bundle them. Get in touch at support@drsparkplay.com.au for a quote.",
        },
        {
          q: "Is there a setup fee?",
          a: "No. No setup fees, no onboarding charges. You only pay the monthly subscription.",
        },
      ],
    },
    {
      category: "Support & Help",
      questions: [
        {
          q: "What if I get stuck?",
          a: "We have a built-in help centre with walkthroughs for every feature. Email support is included (support@drsparkplay.com.au). We aim to respond to support emails within 24 hours.",
        },
        {
          q: "Is there video training?",
          a: "Yes. We have video tutorials for key features (sign-in, observations, activity drafting, family messaging). Longer onboarding sessions are available for teams during your first week.",
        },
        {
          q: "What if something breaks?",
          a: "We monitor the system for outages and will notify you by email if something goes down.",
        },
        {
          q: "Can I request a feature?",
          a: "Yes. Email us your idea at support@drsparkplay.com.au — we read every request and prioritise based on what centres actually need.",
        },
      ],
    },
    {
      category: "Technical",
      questions: [
        {
          q: "What devices does it work on?",
          a: "Any device with a modern web browser (Chrome, Safari, Firefox, Edge). Phones, tablets, desktops. iOS and Android both supported. Also works as a PWA (can be installed like an app).",
        },
        {
          q: "Do I need to download anything?",
          a: "No. It's web-based. Just log in from your browser on any device.",
        },
        {
          q: "What about internet speed?",
          a: "SparkPlay works well on standard NBN speeds (10+ Mbps). It's optimised for slower connections and works offline for key features. If your centre has very limited internet, let us know and we can discuss alternatives.",
        },
        {
          q: "Can I integrate it with other software?",
          a: "Yes. We're building integrations with common centre systems (payroll, messaging, photo management). Let us know what you use and we'll prioritise it.",
        },
      ],
    },
    {
      category: "Data & Compliance",
      questions: [
        {
          q: "Does it satisfy NQS/EYLF requirements?",
          a: "Yes. Observations, EYLF area mappings, and learning outcomes are all built in. The system helps you document what inspectors need to see. It's not a substitute for good teaching, but it makes compliance documentation much easier.",
        },
        {
          q: "Can you help us pass an audit?",
          a: "SparkPlay helps you keep compliant records and demonstrates your processes to inspectors. We have a QIP (Quality Improvement Plan) module and compliance checklists. For actual audit prep, we can discuss your specific needs.",
        },
        {
          q: "What about mandatory reporting?",
          a: "SparkPlay has incident report templates and compliance checks built in. It reminds staff of mandatory reporting obligations and keeps audit trails. It's your responsibility to report, but we make it easier to document and track.",
        },
        {
          q: "Can you help with immunisation requirements?",
          a: "Yes. SparkPlay tracks immunisation status per child and enforces state-specific rules (NSW, VIC, QLD, etc. all have different requirements). It alerts staff when proof is due or overdue.",
        },
      ],
    },
    {
      category: "Migration & Existing Data",
      questions: [
        {
          q: "Can I import my existing data?",
          a: "Yes. If you have historical observations, children, or activity records, we can help import them. Get in touch at support@drsparkplay.com.au and we'll discuss your specific data format.",
        },
        {
          q: "Will I lose data if I switch from another system?",
          a: "No. We can import from most early learning platforms. And if you ever leave SparkPlay, you can export everything.",
        },
        {
          q: "How long does migration take?",
          a: "Depends on how much data you have. For small centres (under 50 children), usually 1–2 days. We handle it on our end; you don't need to do the manual work.",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" className="font-display text-2xl font-bold text-coral-dark">
          DR. <span className="text-coral">Spark</span>Play
        </Link>
        <Link href="/" className="text-ink/70 hover:text-ink transition-colors">
          ← Back
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-12 md:px-10 text-center">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-ink">Frequently Asked Questions</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink/70">
          Can't find what you're looking for? Email us at support@drsparkplay.com.au
        </p>
      </section>

      {/* FAQ Sections */}
      <section className="px-4 md:px-10 py-12 flex-1">
        <div className="max-w-3xl mx-auto space-y-12">
          {faqs.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              <h2 className="font-display text-2xl font-bold text-coral-dark mb-6">
                {section.category}
              </h2>
              <div className="space-y-3">
                {section.questions.map((faq, qIdx) => {
                  const globalIdx = sectionIdx * 100 + qIdx;
                  return (
                    <div
                      key={qIdx}
                      className="rounded-lg border border-ink/10 overflow-hidden bg-white"
                    >
                      <button
                        onClick={() =>
                          setOpenIdx(openIdx === globalIdx ? null : globalIdx)
                        }
                        className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-cream-dark transition-colors"
                      >
                        <h3 className="font-semibold text-ink pr-4">{faq.q}</h3>
                        <div
                          className={`text-xl flex-shrink-0 text-coral transition-transform ${
                            openIdx === globalIdx ? "rotate-180" : ""
                          }`}
                        >
                          ↓
                        </div>
                      </button>
                      {openIdx === globalIdx && (
                        <div className="px-6 py-4 bg-cream-dark border-t border-ink/10">
                          <p className="text-ink/70 leading-relaxed">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 md:px-10 py-16 bg-coral-light">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-6">
            Still have questions?
          </h2>
          <p className="text-ink/70 text-lg mb-8">
            Get in touch with our team. We're happy to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:hello@sparkplay.com.au"
              className="rounded-full bg-coral px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-coral-dark transition-colors"
            >
              Email us
            </a>
            <Link
              href="/tour"
              className="rounded-full border-2 border-coral px-8 py-3 text-base font-semibold text-coral-dark hover:bg-white transition-colors"
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink/10 px-4 py-8 md:px-10">
        <div className="max-w-6xl mx-auto text-center text-sm text-ink/60">
          <p>DR. SparkPlay © 2026 — Built for Australian educators.</p>
        </div>
      </footer>
    </div>
  );
}
