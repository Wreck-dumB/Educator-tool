import type { PosterTheme } from "@/lib/types/database.types";

export const POSTER_THEMES: Record<PosterTheme, { label: string; frame: string; headline: string; accent: string }> = {
  coral: {
    label: "Coral",
    frame: "border-coral bg-coral-light",
    headline: "text-coral-dark",
    accent: "bg-coral",
  },
  sage: {
    label: "Sage",
    frame: "border-sage bg-sage-light",
    headline: "text-sage-dark",
    accent: "bg-sage",
  },
  amber: {
    label: "Sunshine",
    frame: "border-amber bg-amber-light",
    headline: "text-amber-dark",
    accent: "bg-amber",
  },
  ink: {
    label: "Night",
    frame: "border-ink bg-ink",
    headline: "text-cream",
    accent: "bg-coral",
  },
  plain: {
    label: "Plain",
    frame: "border-ink/30 bg-white",
    headline: "text-ink",
    accent: "bg-ink/60",
  },
};

export interface PosterContent {
  title: string;
  subtitle: string | null;
  bodyText: string | null;
  footerText: string | null;
  theme: PosterTheme;
  imageUrl: string | null;
  imageCredit: string | null;
}

/**
 * Pure presentational poster, shared between the builder's live preview and
 * the full-page print view. Uses a plain <img> (not next/image) because the
 * source can be any stock-provider host or a short-lived signed URL.
 */
export default function PosterView({ poster, large = false }: { poster: PosterContent; large?: boolean }) {
  const theme = POSTER_THEMES[poster.theme] ?? POSTER_THEMES.coral;
  const darkText = poster.theme === "ink" ? "text-cream/85" : "text-ink/75";

  return (
    <div
      className={`flex flex-col items-center rounded-3xl border-4 text-center ${theme.frame} ${
        large ? "min-h-[26cm] justify-center gap-6 p-12 print:rounded-none print:border-8" : "gap-3 p-6"
      }`}
    >
      <h2 className={`font-display font-semibold leading-tight ${theme.headline} ${large ? "text-6xl" : "text-2xl"}`}>
        {poster.title || "Your headline"}
      </h2>

      {poster.subtitle && (
        <p className={`font-display font-medium ${darkText} ${large ? "text-3xl" : "text-base"}`}>{poster.subtitle}</p>
      )}

      <div className={`h-1 w-16 rounded-full ${theme.accent} ${large ? "w-32" : ""}`} aria-hidden />

      {poster.imageUrl && (
        <figure className={large ? "w-full max-w-xl" : "w-full max-w-xs"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster.imageUrl}
            alt=""
            className="w-full rounded-2xl object-cover shadow-sm"
            style={{ maxHeight: large ? "12cm" : "10rem" }}
          />
          {poster.imageCredit && (
            <figcaption className={`mt-1 text-[9px] ${darkText}`}>{poster.imageCredit}</figcaption>
          )}
        </figure>
      )}

      {poster.bodyText && (
        <p className={`whitespace-pre-line ${darkText} ${large ? "text-2xl leading-relaxed" : "text-sm"}`}>
          {poster.bodyText}
        </p>
      )}

      {poster.footerText && (
        <p className={`mt-auto font-medium ${theme.headline} ${large ? "text-xl" : "text-xs"}`}>{poster.footerText}</p>
      )}
    </div>
  );
}
