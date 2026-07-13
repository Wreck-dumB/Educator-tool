import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DR. SparkPlay",
    short_name: "DR. SparkPlay",
    description: "EYLF-linked activity ideas and daily care tools for early childhood educators.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdf6f0",
    theme_color: "#e8825a",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Roll Call",
        url: "/attendance",
        description: "Today's attendance register",
      },
      {
        name: "Generate Activity",
        url: "/generate",
        description: "Generate a new activity idea",
      },
      {
        name: "Log Observation",
        url: "/observations",
        description: "Log a learning observation",
      },
    ],
  };
}
