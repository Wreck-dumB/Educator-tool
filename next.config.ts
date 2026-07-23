import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint runs separately — don't block Vercel builds on lint errors.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      // Poster photo uploads go through a server action; the default 1 MB
      // body limit is too small for phone photos.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
