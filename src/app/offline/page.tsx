"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="text-5xl" aria-hidden>
        📵
      </span>
      <h1 className="font-display mt-4 text-2xl font-semibold text-coral-dark">You&apos;re offline</h1>
      <p className="mt-2 text-sm text-ink/60">
        SparkPlay needs a connection to load. Check your internet and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 rounded-full bg-coral px-6 py-2 text-sm font-semibold text-white hover:bg-coral-dark"
      >
        Retry
      </button>
    </div>
  );
}
