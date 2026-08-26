import Link from "next/link";

export default function AboutPage() {
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
        <h1 className="font-display text-4xl md:text-5xl font-bold text-ink">About DR. SparkPlay</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink/70">
          Built by educators, for educators. A better way to run an early learning centre.
        </p>
      </section>

      {/* Story */}
      <section className="px-4 md:px-10 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-ink mb-8">The Story</h2>
          
          <div className="prose prose-ink max-w-none space-y-6 text-lg text-ink/80">
            <p>
              In late 2025, Daniel Rust was working at an early learning centre as a relief educator and director. Every day, he watched educators drown in paperwork. Observations handwritten and photocopied. Compliance documentation scrambled together at close time. Incident reports that took 20 minutes to write. Family messages typed after the children went home. Educators finishing admin at 6:30pm, unpaid, exhausted.
            </p>

            <p>
              &ldquo;There has to be software for this,&rdquo; he thought. He looked. There were systems designed for big corporate chains. There were observation apps that did one thing. There were scheduling tools. But nothing that ran the whole day of an early learning centre — not Australian, not regulation-aware, not intelligent.
            </p>

            <p>
              So he built one.
            </p>

            <p>
              DR. SparkPlay is the result of 19 days of continuous building, informed by conversations with educators across NSW, VIC, QLD, and SA. It&apos;s built on a foundation of:
            </p>

            <ul className="space-y-3">
              <li><strong>Real problems.</strong> Every feature solves something educators actually complain about.</li>
              <li><strong>Regulation compliance.</strong> NQF, EYLF, and state-specific rules are embedded, not bolted on. Educators shouldn&apos;t have to be lawyers.</li>
              <li><strong>AI with guardrails.</strong> We use Claude to handle the writing nobody has time for. But educators stay in control.</li>
              <li><strong>Family transparency.</strong> Parents deserve to know what their children are learning. Observations shared daily, translated into their language, with EYLF links.</li>
              <li><strong>Australian built.</strong> Regulations understood here, support timezone-aligned here.</li>
            </ul>

            <p>
              The DR. in DR. SparkPlay stands for Daniel Rust (he was a doctor for about 8 days before switching to building software). It&apos;s also a doctor joke, which is the kind of thing educators have to endure from software builders.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="px-4 md:px-10 py-16 bg-coral-light">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-ink mb-8 text-center">Our Mission</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-xl bg-white p-6">
              <h3 className="font-semibold text-coral-dark mb-3">For educators</h3>
              <p className="text-ink/70">
                Give back 10+ hours per week by eliminating handwritten admin, duplicated data entry, and paperwork that follows children home. Let educators do what they trained to do: educate.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6">
              <h3 className="font-semibold text-coral-dark mb-3">For families</h3>
              <p className="text-ink/70">
                Parents deserve to know what their children are learning. Daily, in their language, with links to the learning framework. No more crumpled notes excavated from backpacks.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6">
              <h3 className="font-semibold text-coral-dark mb-3">For centres</h3>
              <p className="text-ink/70">
                Compliance built in, not bolted on. Ratios checked automatically. Incident reports ready for audit. Regulations embedded for all 8 states and territories. No guessing, no missed documentation.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6">
              <h3 className="font-semibold text-coral-dark mb-3">For Australia</h3>
              <p className="text-ink/70">
                A tool built by Australians, for Australian regulations. Not a generic overseas product adapted with a checkbox for different state rules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="px-4 md:px-10 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-ink mb-8 text-center">Our Values</h2>
          
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="text-3xl flex-shrink-0">✓</div>
              <div>
                <h3 className="font-semibold text-ink mb-2">Educators come first</h3>
                <p className="text-ink/70">
                  We talk to educators, not to consultants about educators. Every feature is tested with real staff in real centres.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-3xl flex-shrink-0">✓</div>
              <div>
                <h3 className="font-semibold text-ink mb-2">Data is sacred</h3>
                <p className="text-ink/70">
                  Medical records, observations, family contact details — this is sensitive stuff. Encrypted at rest, audit trails logged, role-based access strictly enforced.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-3xl flex-shrink-0">✓</div>
              <div>
                <h3 className="font-semibold text-ink mb-2">Regulation respect</h3>
                <p className="text-ink/70">
                  NQF, EYLF, and state regulations aren&apos;t optional. They&apos;re built into every feature so compliance is automatic, not an afterthought.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-3xl flex-shrink-0">✓</div>
              <div>
                <h3 className="font-semibold text-ink mb-2">Humans in charge</h3>
                <p className="text-ink/70">
                  AI is a tool. It helps with drafts, suggestions, and writing tasks. But educators make the decisions. No decisions are delegated to algorithms.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-3xl flex-shrink-0">✓</div>
              <div>
                <h3 className="font-semibold text-ink mb-2">Transparency</h3>
                <p className="text-ink/70">
                  We tell you how data is used, what the AI does, and how the system works. No dark corners, no mystery algorithms.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Built With */}
      <section className="px-4 md:px-10 py-16 bg-cream-dark">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-ink mb-8 text-center">Built With</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-ink mb-3">Technology</h3>
              <ul className="text-ink/70 space-y-2 text-sm">
                <li>• Next.js 16 (React)</li>
                <li>• TypeScript</li>
                <li>• Supabase (PostgreSQL + Row Level Security)</li>
                <li>• Anthropic Claude API</li>
                <li>• Tailwind CSS</li>
                <li>• Vercel deployment</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-ink mb-3">Inspired By</h3>
              <ul className="text-ink/70 space-y-2 text-sm">
                <li>• Early childhood educators (NSW, VIC, QLD, SA)</li>
                <li>• NQF Quality Standards</li>
                <li>• EYLF Framework</li>
                <li>• Australian Regulations (all 8 states & territories)</li>
                <li>• Accessibility standards (WCAG 2.1 AA)</li>
                <li>• Open source software communities</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="px-4 md:px-10 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-6">
            Join us
          </h2>
          <p className="text-ink/70 text-lg mb-8">
            Built to run a real early learning centre, day to day. Try it free for 7 days.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="rounded-full bg-coral px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-coral-dark transition-colors"
            >
              Start free trial
            </Link>
            <Link
              href="/tour"
              className="rounded-full border-2 border-coral px-8 py-3 text-base font-semibold text-coral-dark hover:bg-coral-light transition-colors"
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
