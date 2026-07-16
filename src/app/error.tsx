"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
      <div className="mb-6 text-6xl">⚠️</div>
      <h1 className="font-display text-4xl font-semibold text-coral-dark">Something went wrong</h1>
      <p className="mt-3 max-w-sm text-ink/60">
        An unexpected error occurred. Try refreshing, or go back to the home page.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          onClick={reset}
          className="rounded-full border border-coral px-6 py-3 text-sm font-semibold text-coral-dark hover:bg-coral-light"
        >
          Try again
        </button>
        <a
          href="/generate"
          className="rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-coral-dark"
        >
          Back to home
        </a>
      </div>
    </div>
  );
}
