import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 text-center">
      <span className="text-5xl" aria-hidden>
        ✨
      </span>
      <h1 className="font-display mt-3 text-5xl font-semibold text-coral-dark">DR. SparkPlay</h1>
      <p className="mt-4 max-w-md text-lg text-ink/70">
        Fun, EYLF-linked activity ideas for early childhood educators &mdash; generated
        from whatever you actually have on hand, with documentation built in.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-2xl">
        <span aria-hidden>🎨</span>
        <span aria-hidden>📦</span>
        <span aria-hidden>🧱</span>
        <span aria-hidden>🧘</span>
        <span aria-hidden>🏃</span>
      </div>
      <div className="mt-8 flex gap-4">
        <Link
          href="/login"
          className="rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-dark"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-full border-2 border-coral px-6 py-3 text-sm font-semibold text-coral-dark transition-colors hover:bg-coral-light"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
