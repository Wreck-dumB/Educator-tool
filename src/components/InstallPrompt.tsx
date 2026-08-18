"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "sparkplay-install-dismissed-at";
const DISMISS_DAYS = 14;

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    // react-hooks/set-state-in-effect (new in this eslint-plugin-react-hooks
    // version) wants effects to only sync FROM external systems, not set
    // state synchronously in the body - but this genuinely can't be a lazy
    // useState initializer instead, since isIos()/isStandalone() read
    // browser-only APIs unavailable during this "use client" component's
    // initial SSR pass; computing them there would risk a hydration
    // mismatch rather than fix anything. This is exactly the sanctioned
    // "detect a client-only capability on mount" case, just one the newer
    // rule can't distinguish from a genuine anti-pattern.
    /* eslint-disable react-hooks/set-state-in-effect -- see comment above */
    if (isIos()) {
      setShowIosHint(true);
      setVisible(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 print:hidden">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-coral-light bg-white p-4 shadow-lg">
        <span className="text-2xl" aria-hidden>
          📲
        </span>
        <div className="flex-1 text-sm text-ink">
          {deferredPrompt ? (
            <>
              <p className="font-semibold">Install DR. SparkPlay</p>
              <p className="text-ink/60">Add it to your home screen for quick, full-screen access.</p>
            </>
          ) : showIosHint ? (
            <>
              <p className="font-semibold">Add to Home Screen</p>
              <p className="text-ink/60">
                Tap the Share icon, then &quot;Add to Home Screen&quot;, for quick, full-screen access.
              </p>
            </>
          ) : null}
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          {deferredPrompt && (
            <button
              type="button"
              onClick={install}
              className="rounded-full bg-coral px-4 py-1.5 text-sm font-semibold text-white hover:bg-coral-dark"
            >
              Install
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="text-xs text-ink/50 hover:text-ink"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
