import Link from "next/link";

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <nav className="flex items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" className="font-display text-2xl font-bold text-coral-dark">
          DR. <span className="text-coral">Spark</span>Play
        </Link>
        <Link href="/" className="text-ink/70 hover:text-ink transition-colors">
          ← Back
        </Link>
      </nav>

      <section className="flex flex-col items-center justify-center px-4 py-12 md:px-10 text-center">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-ink">Try the demo</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink/70">
          Get your own fully working demo centre, seeded with sample children and activities. No sign-up,
          no shared login — it&apos;s yours alone to explore.
        </p>
      </section>

      <section className="px-4 md:px-10 py-12 flex-1">
        <div className="max-w-2xl mx-auto">
          {error && (
            <div className="mb-6 rounded-lg bg-coral-light px-4 py-3 text-sm text-coral-dark">{error}</div>
          )}

          <div className="rounded-2xl bg-white p-8 border-2 border-coral-light mb-8 text-center">
            <h2 className="font-display text-2xl font-bold text-ink mb-4">Sunny Days Demo Centre</h2>
            <p className="text-ink/70 mb-6">
              Click below and we&apos;ll set up a private demo centre just for you in a few seconds — 3 sample
              children, a couple of pre-loaded activities, and today&apos;s attendance already signed in.
            </p>
            <form action="/api/demo/start" method="POST">
              <button
                type="submit"
                className="inline-block rounded-full bg-coral px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-coral-dark transition-colors"
              >
                Start my demo centre
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-coral-light p-8">
            <h2 className="font-display text-2xl font-bold text-ink mb-6">What&apos;s in the demo</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">🏢</span>
                <div>
                  <h3 className="font-semibold text-ink">Your own centre</h3>
                  <p className="text-sm text-ink/70">Fully isolated — nothing you do affects anyone else&apos;s demo</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">👶</span>
                <div>
                  <h3 className="font-semibold text-ink">3 demo children</h3>
                  <p className="text-sm text-ink/70">With profiles, interests, and sample observations already recorded</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">🎨</span>
                <div>
                  <h3 className="font-semibold text-ink">Pre-loaded activities</h3>
                  <p className="text-sm text-ink/70">EYLF-linked activity examples ready to browse</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">✓</span>
                <div>
                  <h3 className="font-semibold text-ink">All features unlocked</h3>
                  <p className="text-sm text-ink/70">Try observations, AI drafting, compliance, family messaging</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-lg bg-amber-light p-4 border border-amber-dark/20">
            <p className="text-sm text-amber-dark">
              <strong>Note:</strong> Demo centres are automatically removed after 48 hours. To keep your
              data, sign up for a real account (first 7 days free).
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 md:px-10 py-16 bg-coral-light">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-6">Ready to try for real?</h2>
          <p className="text-ink/70 text-lg mb-8">Create your own centre. 7-day free trial, all features included.</p>
          <Link
            href="/signup"
            className="inline-block rounded-full bg-coral px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-coral-dark transition-colors"
          >
            Start free trial
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink/10 px-4 py-8 md:px-10">
        <div className="max-w-6xl mx-auto text-center text-sm text-ink/60">
          <p>DR. SparkPlay © 2026 — Built for Australian educators.</p>
        </div>
      </footer>
    </div>
  );
}
