"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Catches errors in the root layout itself (rare — src/app/error.tsx above
// catches everything else). Can't use the app's normal layout/styles here
// since the root layout is exactly what crashed.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px", fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ marginTop: "0.75rem", color: "#666" }}>
          Please refresh the page. If this keeps happening, contact support.
        </p>
      </body>
    </html>
  );
}
