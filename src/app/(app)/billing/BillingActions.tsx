"use client";

import { useState } from "react";
import type { Plan } from "@/lib/stripe";

async function goToCheckout(body: Record<string, unknown>, setError: (msg: string | null) => void, setBusy: (v: boolean) => void) {
  setBusy(true);
  setError(null);
  try {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setBusy(false);
      return;
    }
    window.location.href = data.url;
  } catch {
    setError("Couldn't reach billing — try again in a moment.");
    setBusy(false);
  }
}

export function ChoosePlanButton({ plan }: { plan: Plan }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => goToCheckout({ plan }, setError, setBusy)}
        className="w-full rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral-dark disabled:opacity-60"
      >
        {busy ? "Redirecting…" : "Choose this plan"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function BuyTopupButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => goToCheckout({ kind: "topup" }, setError, setBusy)}
        className="rounded-lg border border-coral px-4 py-2 text-sm font-semibold text-coral-dark hover:bg-coral-light"
      >
        {busy ? "Redirecting…" : "Buy 25 credits — $15"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function ManageBillingButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/billing/portal", { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error ?? "Something went wrong.");
              setBusy(false);
              return;
            }
            window.location.href = data.url;
          } catch {
            setError("Couldn't reach billing — try again in a moment.");
            setBusy(false);
          }
        }}
        className="rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-cream-dark"
      >
        {busy ? "Redirecting…" : "Manage subscription"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
