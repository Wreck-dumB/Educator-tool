import Link from "next/link";

/**
 * Shown to a regular staff member who is not currently signed in for a shift.
 * Children's information is only available while on shift.
 */
export default function ShiftLockedNotice() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-coral-light bg-coral-light/20 p-6 text-center">
        <span className="text-3xl" aria-hidden>
          🔒
        </span>
        <h1 className="mt-3 font-display text-xl font-semibold text-ink">
          Children&apos;s information is locked
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          For privacy, you can only view children&apos;s information while you&apos;re signed in for
          a shift. Sign in on the attendance board to continue, and it will lock again when you sign
          out.
        </p>
        <Link
          href="/signin"
          className="mt-4 inline-block rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-dark"
        >
          Go to sign-in board
        </Link>
      </div>
    </div>
  );
}
