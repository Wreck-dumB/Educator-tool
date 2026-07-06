// Copyright-safe stock image search for the poster maker.
//
// Two providers behind one interface:
// - Pexels (preferred, used when PEXELS_API_KEY is set): one uniform licence
//   — free for commercial use, no attribution required, hotlinking allowed.
//   Free key at pexels.com/api, 200 requests/hour.
// - Openverse (zero-signup fallback): aggregated Creative Commons images,
//   no API key needed but anonymously limited to ~5 requests/hour, and
//   individual images may require an attribution line (surfaced via
//   requiresAttribution so the poster prints the credit).
//
// Results are cached in-memory per query for 15 minutes — mainly to stretch
// Openverse's tiny anonymous budget. Same per-instance caveat as rateLimit.ts.

export interface StockImage {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  credit: string;
  creditUrl: string;
  requiresAttribution: boolean;
  provider: "pexels" | "openverse";
}

const cache = new Map<string, { ts: number; results: StockImage[] }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

export async function searchStockImages(query: string): Promise<StockImage[]> {
  const key = query.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return hit.results;
  }

  const results = process.env.PEXELS_API_KEY
    ? await searchPexels(key, process.env.PEXELS_API_KEY)
    : await searchOpenverse(key);

  cache.set(key, { ts: Date.now(), results });
  return results;
}

interface PexelsPhoto {
  id: number;
  url: string;
  photographer: string;
  src: { large: string; medium: string };
}

async function searchPexels(query: string, apiKey: string): Promise<StockImage[]> {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12`,
    { headers: { Authorization: apiKey } },
  );
  if (!res.ok) {
    throw new Error(`Pexels search failed (${res.status})`);
  }
  const data = (await res.json()) as { photos?: PexelsPhoto[] };
  return (data.photos ?? []).map((p) => ({
    id: `pexels-${p.id}`,
    thumbUrl: p.src.medium,
    fullUrl: p.src.large,
    credit: `Photo by ${p.photographer} on Pexels`,
    creditUrl: p.url,
    requiresAttribution: false,
    provider: "pexels" as const,
  }));
}

interface OpenverseResult {
  id: string;
  title: string | null;
  url: string;
  thumbnail: string | null;
  license: string;
  attribution: string | null;
  foreign_landing_url: string | null;
}

async function searchOpenverse(query: string): Promise<StockImage[]> {
  // license_type=commercial limits results to licences safe for a service's
  // fliers (CC0, PDM, CC BY, CC BY-SA).
  const res = await fetch(
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=12&license_type=commercial`,
    { headers: { Accept: "application/json" } },
  );
  if (res.status === 429) {
    throw new Error(
      "The free image service's hourly limit is used up — try again in an hour, or add a free Pexels API key for 200 searches/hour.",
    );
  }
  if (!res.ok) {
    throw new Error(`Openverse search failed (${res.status})`);
  }
  const data = (await res.json()) as { results?: OpenverseResult[] };
  return (data.results ?? [])
    .filter((r) => r.url)
    .map((r) => {
      const publicDomain = r.license === "cc0" || r.license === "pdm";
      return {
        id: `openverse-${r.id}`,
        thumbUrl: r.thumbnail ?? r.url,
        fullUrl: r.url,
        credit: r.attribution ?? `"${r.title ?? "Image"}" (${r.license.toUpperCase()}) via Openverse`,
        creditUrl: r.foreign_landing_url ?? r.url,
        requiresAttribution: !publicDomain,
        provider: "openverse" as const,
      };
    });
}
