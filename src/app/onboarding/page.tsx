import { startNewService } from "./actions";
import { inputClass, cardClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className={`w-full max-w-sm space-y-6 p-8 ${cardClass}`}>
        <div className="text-center">
          <span className="text-3xl" aria-hidden>
            🏫
          </span>
          <h1 className="font-display mt-2 text-2xl font-semibold text-coral-dark">Welcome to SparkPlay</h1>
          <p className="mt-1 text-sm text-ink/60">Let&apos;s get your account set up.</p>
        </div>

        {error && <p className={errorBannerClass}>{error}</p>}

        <form action={startNewService} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink/80">
              Your service&apos;s name
            </label>
            <input id="name" name="name" type="text" placeholder="e.g. Sunshine Early Learning" className={inputClass} />
          </div>
          <button type="submit" className={`w-full ${primaryButtonClass}`}>
            Start my service
          </button>
        </form>

        <p className="text-center text-xs text-ink/50">
          Were you invited to join a service as staff? Use the invite link from your email instead of
          starting a new service here.
        </p>
      </div>
    </div>
  );
}
