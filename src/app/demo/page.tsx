"use client";

import Link from "next/link";
import { useState } from "react";

export default function DemoPage() {
  const [copied, setCopied] = useState(false);

  const demoEmail = "demo@sparkplay.com.au";
  const demoPassword = "DemoSparkPlay123!";

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        <h1 className="font-display text-4xl md:text-5xl font-bold text-ink">Try the demo</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink/70">
          Explore DR. SparkPlay with a fully seeded demo centre. No sign-up required.
        </p>
      </section>

      {/* Demo Credentials */}
      <section className="px-4 md:px-10 py-12 flex-1">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl bg-white p-8 border-2 border-coral-light mb-8">
            <h2 className="font-display text-2xl font-bold text-ink mb-6">Demo Credentials</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-ink/70 mb-2">Email</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={demoEmail}
                    className="flex-1 px-4 py-3 rounded-lg bg-cream-dark border border-ink/10 text-ink font-mono"
                  />
                  <button
                    onClick={() => handleCopy(demoEmail)}
                    className="px-4 py-3 rounded-lg bg-coral text-white font-semibold hover:bg-coral-dark transition-colors"
                  >
                    {copied ? "✓" : "Copy"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink/70 mb-2">Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={demoPassword}
                    className="flex-1 px-4 py-3 rounded-lg bg-cream-dark border border-ink/10 text-ink font-mono"
                  />
                  <button
                    onClick={() => handleCopy(demoPassword)}
                    className="px-4 py-3 rounded-lg bg-coral text-white font-semibold hover:bg-coral-dark transition-colors"
                  >
                    {copied ? "✓" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-ink/10">
              <Link
                href="/login"
                className="inline-block w-full rounded-full bg-coral px-8 py-3 text-center text-base font-semibold text-white shadow-lg hover:bg-coral-dark transition-colors"
              >
                Log in to demo
              </Link>
            </div>
          </div>

          {/* What's Included */}
          <div className="rounded-2xl bg-coral-light p-8">
            <h2 className="font-display text-2xl font-bold text-ink mb-6">What's in the demo</h2>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">🏢</span>
                <div>
                  <h3 className="font-semibold text-ink">Demo Centre</h3>
                  <p className="text-sm text-ink/70">A fully configured centre with realistic settings</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">👶</span>
                <div>
                  <h3 className="font-semibold text-ink">3 demo children</h3>
                  <p className="text-sm text-ink/70">With profiles, photos, allergies, and historical observations</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">📸</span>
                <div>
                  <h3 className="font-semibold text-ink">Sample observations</h3>
                  <p className="text-sm text-ink/70">Real examples of how observations are formatted and shared</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">🎨</span>
                <div>
                  <h3 className="font-semibold text-ink">Pre-loaded activities</h3>
                  <p className="text-sm text-ink/70">EYLF-linked activity templates ready to use</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">✓</span>
                <div>
                  <h3 className="font-semibold text-ink">All features unlocked</h3>
                  <p className="text-sm text-ink/70">Try everything: observations, AI drafting, compliance, family messaging</p>
                </div>
              </div>
            </div>
          </div>

          {/* What You Can Do */}
          <div className="mt-8 rounded-2xl bg-white p-8 border border-ink/10">
            <h2 className="font-display text-2xl font-bold text-ink mb-6">Try these things</h2>
            
            <div className="space-y-4 text-ink/70">
              <div>
                <h3 className="font-semibold text-ink mb-2">📸 Create an observation</h3>
                <p className="text-sm">
                  Go to a child's profile, write an observation, and see how it gets expanded into full EYLF-linked text.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink mb-2">🎨 Draft an activity</h3>
                <p className="text-sm">
                  Tell the AI what materials you have, and it drafts a full activity with steps, learning outcomes, and reflection prompts.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink mb-2">📋 Check ratios</h3>
                <p className="text-sm">
                  Go to the on-site board and see how SparkPlay automatically checks your staff:child ratios against NSW regulations.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink mb-2">💬 Send a broadcast</h3>
                <p className="text-sm">
                  Compose a message and see how it can be broadcast to families in 15 languages at once.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink mb-2">📊 Explore reporting</h3>
                <p className="text-sm">
                  Check the audit section to see compliance documentation, incident records, and attendance reporting.
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-8 rounded-lg bg-amber-light p-4 border border-amber-dark/20">
            <p className="text-sm text-amber-dark">
              <strong>Note:</strong> The demo resets every 24 hours. Any changes you make will be cleared. To keep your data, sign up for a real account (first 7 days free).
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 md:px-10 py-16 bg-coral-light">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-6">
            Ready to try for real?
          </h2>
          <p className="text-ink/70 text-lg mb-8">
            Create your own centre. 7-day free trial, all features included.
          </p>
          <Link
            href="/signup"
            className="inline-block rounded-full bg-coral px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-coral-dark transition-colors"
          >
            Start free trial
          </Link>
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
