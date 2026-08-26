import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-10">
        <div className="font-display text-2xl font-bold text-coral-dark">
          DR. <span className="text-coral">Spark</span>Play
        </div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-full px-5 py-2 text-sm font-semibold text-ink hover:text-coral-dark transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-coral-dark transition-colors"
          >
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 md:px-10 text-center">
        <span className="text-6xl md:text-7xl" aria-hidden>
          ✨
        </span>
        <h1 className="font-display mt-6 text-5xl md:text-6xl font-bold text-ink leading-tight">
          Run the centre.<br />
          <span className="text-coral">Not the photocopier.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg md:text-xl text-ink/70 leading-relaxed">
          The all-in-one platform for Australian early learning centres — sign-in, observations, programming, compliance, and family communication — with AI that does the writing nobody has time for.
        </p>
        
        {/* Badges */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <div className="inline-block rounded-full bg-coral-light px-4 py-2 text-sm font-semibold text-coral-dark">
            ✓ Built for NQF & EYLF
          </div>
          <div className="inline-block rounded-full bg-sage-light px-4 py-2 text-sm font-semibold text-sage-dark">
            ✓ All 8 states & territories
          </div>
          <div className="inline-block rounded-full bg-amber-light px-4 py-2 text-sm font-semibold text-amber-dark">
            ✓ AI in control, humans in charge
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/signup"
            className="rounded-full bg-coral px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-coral-dark transition-colors"
          >
            Try for free
          </Link>
          <Link
            href="/tour"
            className="rounded-full border-2 border-coral px-8 py-3 text-base font-semibold text-coral-dark hover:bg-coral-light transition-colors"
          >
            See how it works
          </Link>
        </div>

        {/* Emoji divider */}
        <div className="mt-12 flex justify-center gap-4 text-3xl">
          <span aria-hidden>🚪</span>
          <span aria-hidden>📋</span>
          <span aria-hidden>🎯</span>
          <span aria-hidden>💬</span>
          <span aria-hidden>🛡️</span>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 md:px-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-ink mb-12">
            Three things educators actually need
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="rounded-2xl bg-white p-8 shadow-sm border border-ink/5">
              <div className="text-4xl mb-4">🌞</div>
              <h3 className="font-display text-xl font-bold text-ink mb-3">Run the day</h3>
              <p className="text-ink/70 leading-relaxed">
                Kiosk sign-in, roll call, day plans, activities, observations, handover — the daily rhythm of a centre, minus the paper and the stress.
              </p>
              <div className="mt-4 space-y-2 text-sm text-ink/60">
                <div>✓ Wellbeing check-ins at arrival</div>
                <div>✓ Live ratio checks (your state&apos;s rules)</div>
                <div>✓ EpiPen & allergy badges on the room board</div>
                <div>✓ Observations in 2 minutes, not 20</div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl bg-white p-8 shadow-sm border border-ink/5">
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="font-display text-xl font-bold text-ink mb-3">Stay compliant</h3>
              <p className="text-ink/70 leading-relaxed">
                Ratios, incident reports, medication logs, NQS self-assessment — compliance built into the workflow, not bolted on after.
              </p>
              <div className="mt-4 space-y-2 text-sm text-ink/60">
                <div>✓ Regs automated (not memorised)</div>
                <div>✓ Multi-state regulation handling</div>
                <div>✓ QIP documentation ready to go</div>
                <div>✓ Audit trails built in</div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl bg-white p-8 shadow-sm border border-ink/5">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="font-display text-xl font-bold text-ink mb-3">Keep families close</h3>
              <p className="text-ink/70 leading-relaxed">
                Daily diaries, messages, community wall, broadcasts in 15 languages — parents in the loop, not in the dark.
              </p>
              <div className="mt-4 space-y-2 text-sm text-ink/60">
                <div>✓ Photo updates & observations shared instantly</div>
                <div>✓ Multi-language broadcasts</div>
                <div>✓ Invoices & payments integrated</div>
                <div>✓ Parent self-service enrolment</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="px-4 py-16 md:px-10 bg-coral-light">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-coral-dark mb-8">
            AI that actually helps
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 border border-coral/10">
              <div className="text-2xl mb-3">✍️</div>
              <h3 className="font-semibold text-ink mb-2">Activity drafting</h3>
              <p className="text-ink/70 text-sm">
                Tell the AI what you have on hand. It drafts EYLF-linked activities with materials, steps, and learning outcomes. You edit and approve.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-coral/10">
              <div className="text-2xl mb-3">📝</div>
              <h3 className="font-semibold text-ink mb-2">Observation writing</h3>
              <p className="text-ink/70 text-sm">
                Snap a photo. Write one sentence. AI expands it into a thoughtful observation linked to EYLF outcomes. Parent and portfolio ready.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-coral/10">
              <div className="text-2xl mb-3">🎯</div>
              <h3 className="font-semibold text-ink mb-2">Personalisation</h3>
              <p className="text-ink/70 text-sm">
                Activities tailored to each child&apos;s interests, developmental stage, and EYLF learning themes. No generic worksheets.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-coral/10">
              <div className="text-2xl mb-3">📋</div>
              <h3 className="font-semibold text-ink mb-2">Compliance docs</h3>
              <p className="text-ink/70 text-sm">
                Policy drafts, incident reports, QIP entries — AI handles the first draft. You stay in control of what matters.
              </p>
            </div>
          </div>
          <p className="mt-8 text-center text-ink/70 text-sm">
            <strong>Our principle:</strong> AI does the writing you don&apos;t have time for. You keep the decisions that matter.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 py-16 md:px-10 bg-cream-dark">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-ink mb-12">
            Questions?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-ink mb-2">Is it secure?</h3>
              <p className="text-ink/70 text-sm">
                Yes. All data encrypted in transit and at rest, hosted in Australia on Supabase, with password-protected, role-based access.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink mb-2">Does it work offline?</h3>
              <p className="text-ink/70 text-sm">
                Core features work as a PWA. Photos and observations sync when you&apos;re back online.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink mb-2">What about my state&apos;s rules?</h3>
              <p className="text-ink/70 text-sm">
                Built for all 8 states and territories. Regulations are embedded (ratios, mandatory reporting, immunisation rules, etc).
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink mb-2">How much does it cost?</h3>
              <p className="text-ink/70 text-sm">
                Starting from $59/month, with plans up to $129/month as your centre grows. No setup fees.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink mb-2">Can I export my data?</h3>
              <p className="text-ink/70 text-sm">
                Yes. Observations, children profiles, and compliance records export to PDF or CSV.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink mb-2">Is there training?</h3>
              <p className="text-ink/70 text-sm">
                Built-in tutorials and a help centre. Video walkthroughs for key features. Email support included.
              </p>
            </div>
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/faq"
              className="text-coral-dark font-semibold hover:text-coral transition-colors"
            >
              See full FAQ →
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16 md:px-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-6">
            Ready to run the centre, not the paperwork?
          </h2>
          <p className="text-ink/70 text-lg mb-8">
            Try DR. SparkPlay for free. 7-day trial, no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="rounded-full bg-coral px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-coral-dark transition-colors"
            >
              Start free trial
            </Link>
            <Link
              href="/demo"
              className="rounded-full border-2 border-coral px-8 py-3 text-base font-semibold text-coral-dark hover:bg-coral-light transition-colors"
            >
              See demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 border-t border-ink/10 px-4 py-8 md:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-ink mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-ink/70">
                <li><Link href="/tour" className="hover:text-coral">Features</Link></li>
                <li><Link href="/demo" className="hover:text-coral">Demo</Link></li>
                <li><Link href="/faq" className="hover:text-coral">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-ink mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-ink/70">
                <li><a href="mailto:support@drsparkplay.com.au" className="hover:text-coral">Email us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-ink mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-ink/70">
                <li><Link href="/privacy" className="hover:text-coral">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-coral">Terms</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-ink mb-3">About</h4>
              <ul className="space-y-2 text-sm text-ink/70">
                <li><Link href="/about" className="hover:text-coral">About us</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-ink/10 pt-8 text-center text-sm text-ink/60">
            <p>DR. SparkPlay © 2026 — Built for Australian educators.</p>
            <p className="mt-2">The DR. is a doctor joke. It also stands for Daniel Rust, who built it. Both facts hold up under peer review.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
