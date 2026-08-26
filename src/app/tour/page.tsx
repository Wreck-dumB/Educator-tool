"use client";

import Link from "next/link";
import { useState } from "react";

export default function TourPage() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      time: "7:30am",
      title: "Families arrive",
      description: "Kiosk sign-in with a wellbeing check-in — no clipboard, no pen on a string.",
      icon: "🚪",
      details: [
        "Parents check children in via touchscreen",
        "Wellbeing quick-check: mood, sleep, appetite",
        "Allergies & EpiPen badges displayed live",
        "No paper clipboard needed",
      ],
    },
    {
      time: "9:00am",
      title: "Roll call & ratios",
      description: "Live ratio check against your state's rules. Allergy and EpiPen badges right on the room board.",
      icon: "📋",
      details: [
        "Staff:child ratios calculated automatically",
        "Your state's regulations enforced (NSW/VIC/QLD/etc)",
        "Medical needs visible at a glance",
        "No guessing, no missed documentation",
      ],
    },
    {
      time: "10:15am",
      title: "Observations",
      description: "An educator snaps an observation. One save and it's shared with the parent, the child's interests are updated, and a linked activity lands in next week's program.",
      icon: "📸",
      details: [
        "Snap a photo of the child learning",
        "Write one sentence about what happened",
        "AI expands it into a full EYLF-linked observation",
        "Automatically shared with the family",
        "Interests updated for personalised activities",
      ],
    },
    {
      time: "12:30pm",
      title: "Medication & compliance",
      description: "Medication logged — dose, route, authorisation, witness. Regulation 93 compliant without opening the regulations.",
      icon: "💊",
      details: [
        "Log every dose with timestamp",
        "Witness sign-off recorded automatically",
        "Allergy alerts triggered before administration",
        "Audit trail for inspectors or parents",
      ],
    },
    {
      time: "2:00pm",
      title: "Activity planning",
      description: "The AI drafts an activity from the children's actual current interests, mapped to EYLF outcomes. The educator tweaks and approves.",
      icon: "🎨",
      details: [
        "AI sees each child's recent observations",
        "Drafts activity from what you have on hand",
        "Links learning outcomes (EYLF/NQF)",
        "Includes materials, steps, and reflection prompts",
        "Educator approves or personalises before saving",
      ],
    },
    {
      time: "5:45pm",
      title: "Shift handover",
      description: "Handover typed and acknowledged by the incoming educator. The sacred paper handover book retires with full honours.",
      icon: "✋",
      details: [
        "Outgoing staff write a typed handover",
        "Incoming staff read and acknowledge receipt",
        "Medical alerts and behaviour notes highlighted",
        "Observations from the day summarised",
        "Nothing forgotten, nothing missed",
      ],
    },
    {
      time: "6:01pm",
      title: "Everyone goes home",
      description: "On time. No admin paperwork waiting.",
      icon: "🏠",
      details: [
        "All observations already shared with families",
        "Compliance documentation ready",
        "Nothing left to type at 6:30pm",
        "Work-life balance restored",
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
        <h1 className="font-display text-4xl md:text-5xl font-bold text-ink">A day with DR. SparkPlay</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink/70">
          See how educators spend less time on paperwork and more time on the children. From 7:30am sign-in to 6:01pm home time.
        </p>
      </section>

      {/* Timeline */}
      <section className="px-4 md:px-10 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Timeline */}
            <div className="space-y-3">
              {steps.map((step, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full text-left rounded-lg px-4 py-3 transition-colors ${
                    activeStep === idx
                      ? "bg-coral-light border-2 border-coral text-ink font-semibold"
                      : "bg-white border border-ink/10 text-ink/70 hover:bg-cream-dark"
                  }`}
                >
                  <div className="font-semibold">{step.time}</div>
                  <div className="text-sm">{step.title}</div>
                </button>
              ))}
            </div>

            {/* Right: Details */}
            <div className="rounded-2xl bg-white border-2 border-coral-light p-8">
              <div className="text-5xl mb-4">{steps[activeStep].icon}</div>
              <h2 className="font-display text-2xl font-bold text-ink mb-2">
                {steps[activeStep].title}
              </h2>
              <p className="text-ink/70 mb-6">{steps[activeStep].description}</p>
              
              <div className="bg-coral-light rounded-lg p-4 space-y-2">
                {steps[activeStep].details.map((detail, idx) => (
                  <div key={idx} className="flex gap-3 text-sm">
                    <span className="text-coral-dark font-bold">✓</span>
                    <span className="text-ink">{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 md:px-10 py-16 bg-coral-light">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-ink mb-12">
            60+ tools built in
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-xl bg-white p-6">
              <h3 className="font-semibold text-coral-dark mb-3">🚪 Front Desk</h3>
              <ul className="text-sm text-ink/70 space-y-1">
                <li>• Kiosk sign in/out</li>
                <li>• On-site board</li>
                <li>• Roll call</li>
                <li>• Casual days</li>
                <li>• Visitor log</li>
              </ul>
            </div>

            <div className="rounded-xl bg-white p-6">
              <h3 className="font-semibold text-coral-dark mb-3">📋 Documentation</h3>
              <ul className="text-sm text-ink/70 space-y-1">
                <li>• Observations</li>
                <li>• Incident reports</li>
                <li>• Medication logs</li>
                <li>• Handover notes</li>
                <li>• Sleep records</li>
              </ul>
            </div>

            <div className="rounded-xl bg-white p-6">
              <h3 className="font-semibold text-coral-dark mb-3">🎯 Programming</h3>
              <ul className="text-sm text-ink/70 space-y-1">
                <li>• Activity drafting</li>
                <li>• EYLF mapping</li>
                <li>• Programs & day plans</li>
                <li>• Worksheets</li>
                <li>• Brain breaks</li>
              </ul>
            </div>

            <div className="rounded-xl bg-white p-6">
              <h3 className="font-semibold text-coral-dark mb-3">💬 Family Communication</h3>
              <ul className="text-sm text-ink/70 space-y-1">
                <li>• Daily diaries</li>
                <li>• Broadcasts (15 languages)</li>
                <li>• Community wall</li>
                <li>• Photo sharing</li>
                <li>• Messages</li>
              </ul>
            </div>

            <div className="rounded-xl bg-white p-6">
              <h3 className="font-semibold text-coral-dark mb-3">🛡️ Compliance</h3>
              <ul className="text-sm text-ink/70 space-y-1">
                <li>• Ratio checks</li>
                <li>• Incident reports</li>
                <li>• NQS self-assessment</li>
                <li>• QIP tracking</li>
                <li>• Audit trails</li>
              </ul>
            </div>

            <div className="rounded-xl bg-white p-6">
              <h3 className="font-semibold text-coral-dark mb-3">💰 Admin</h3>
              <ul className="text-sm text-ink/70 space-y-1">
                <li>• Invoicing & payments</li>
                <li>• CCS estimator</li>
                <li>• Staff management</li>
                <li>• Centre settings</li>
                <li>• Reporting</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="px-4 md:px-10 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-ink mb-12">
            Why educators choose DR. SparkPlay
          </h2>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="text-3xl flex-shrink-0">⏱️</div>
              <div>
                <h3 className="font-semibold text-ink mb-1">Save 10+ hours per week</h3>
                <p className="text-ink/70">
                  No more handwritten observations, no more transcribing, no more admin after close. Work finishes when the children leave.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-3xl flex-shrink-0">🧠</div>
              <div>
                <h3 className="font-semibold text-ink mb-1">Compliance isn't optional</h3>
                <p className="text-ink/70">
                  NQF/EYLF/state regulations built in. Ratios, mandatory reporting, incident records — all automated and audit-ready.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-3xl flex-shrink-0">👨‍👩‍👧</div>
              <div>
                <h3 className="font-semibold text-ink mb-1">Families actually know what's happening</h3>
                <p className="text-ink/70">
                  Observations shared instantly, translated into 15 languages, with EYLF links so parents understand the learning.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-3xl flex-shrink-0">🤖</div>
              <div>
                <h3 className="font-semibold text-ink mb-1">AI does the writing, you do the thinking</h3>
                <p className="text-ink/70">
                  Activity drafts, observation write-ups, policy templates — AI handles the first draft. You stay in control of what matters.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-3xl flex-shrink-0">📱</div>
              <div>
                <h3 className="font-semibold text-ink mb-1">Works online and offline</h3>
                <p className="text-ink/70">
                  PWA architecture means the app works even without internet. Photos and data sync when you're back online.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-3xl flex-shrink-0">🔒</div>
              <div>
                <h3 className="font-semibold text-ink mb-1">Your data is secure</h3>
                <p className="text-ink/70">
                  Encryption in transit and at rest, role-based access, audit trails. Built for privacy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Try for Free */}
      <section className="px-4 md:px-10 py-16 bg-cream-dark">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-6">
            Try DR. SparkPlay today
          </h2>
          <p className="text-ink/70 text-lg mb-8">
            7-day free trial. No credit card required. All features included.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="rounded-full bg-coral px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-coral-dark transition-colors"
            >
              Start free trial
            </Link>
            <Link
              href="/login"
              className="rounded-full border-2 border-coral px-8 py-3 text-base font-semibold text-coral-dark hover:bg-coral-light transition-colors"
            >
              Log in
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
