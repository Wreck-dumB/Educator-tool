"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-full border border-sage-light bg-sage-light px-3 py-1.5 text-xs font-semibold text-sage-dark hover:bg-sage-light/70 transition-colors"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
