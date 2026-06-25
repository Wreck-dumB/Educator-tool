// Shared Tailwind class strings for the warm/playful theme, kept in one place
// so every page's form fields, cards, and buttons stay visually consistent.

export const inputClass =
  "mt-1 block w-full rounded-xl border border-coral-light bg-white px-3 py-2 shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral";

export const cardClass = "rounded-2xl border border-coral-light bg-white shadow-sm";

export const primaryButtonClass =
  "rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-dark disabled:opacity-50";

export const secondaryButtonClass =
  "rounded-full border-2 border-sage px-4 py-2 text-sm font-semibold text-sage-dark transition-colors hover:bg-sage-light disabled:opacity-50";

export const dangerLinkClass = "text-sm font-medium text-coral-dark hover:underline";

export const errorBannerClass = "mt-4 rounded-xl bg-coral-light px-3 py-2 text-sm text-coral-dark";
export const successBannerClass = "mt-4 rounded-xl bg-sage-light px-3 py-2 text-sm text-sage-dark";
