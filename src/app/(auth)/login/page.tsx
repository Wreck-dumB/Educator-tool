import Link from "next/link";
import { login } from "@/app/auth/actions";

const inputClass =
  "mt-1 block w-full rounded-xl border border-coral-light bg-white px-3 py-2.5 shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-coral-light bg-white p-8 shadow-sm">
        <div className="text-center">
          <span className="text-3xl" aria-hidden>
            ✨
          </span>
          <h1 className="font-display mt-2 text-2xl font-semibold text-coral-dark">DR. SparkPlay</h1>
          <p className="mt-1 text-sm text-ink/60">Log in to your account</p>
        </div>

        {error && (
          <p className="rounded-xl bg-coral-light px-3 py-2 text-sm text-coral-dark">{error}</p>
        )}

        <form action={login} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink/80">
              Email
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink/80">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-coral px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
          >
            Log in
          </button>
        </form>

        <p className="text-center text-sm text-ink/60">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-coral-dark hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
