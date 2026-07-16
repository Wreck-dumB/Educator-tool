import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
      <div className="mb-6 text-6xl">🔍</div>
      <h1 className="font-display text-4xl font-semibold text-coral-dark">Page not found</h1>
      <p className="mt-3 max-w-sm text-ink/60">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/generate"
        className="mt-8 rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-coral-dark"
      >
        Back to home
      </Link>
    </div>
  );
}
