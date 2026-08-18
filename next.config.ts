import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Poster photo uploads go through a server action; the default 1 MB
      // body limit is too small for phone photos.
      bodySizeLimit: "6mb",
    },
  },
  // pdf-parse (via pdfjs-dist) locates its worker script by a path relative
  // to its own real node_modules location at runtime - Next's default
  // Server Components bundling relocates the module and breaks that lookup
  // ("Cannot find module '.next/.../pdf.worker.mjs'"), which silently broke
  // every PDF upload in Import & Review while DOCX kept working fine.
  // Excluding it from bundling (native Node require instead) fixes it.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Source map upload auth token - build-time secret, separate from the
  // DSN. Not yet set; upload silently no-ops without it (build still
  // succeeds) until it's added, at which point production stack traces
  // switch from minified to real file/line/function.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  widenClientFileUpload: true,

  // Proxies Sentry's own ingest requests through this app's own domain so
  // ad-blockers (which commonly block *.sentry.io by pattern) don't also
  // silently block error reporting.
  tunnelRoute: "/monitoring",

  // This project runs on Turbopack (dev and build), not webpack - the
  // plugin's webpack-only tree-shaking options don't apply here.
  silent: !process.env.CI,
});
