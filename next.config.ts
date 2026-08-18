import type { NextConfig } from "next";

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

export default nextConfig;
