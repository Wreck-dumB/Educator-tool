import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // includeLocalVariables deliberately left off - it starts a Node inspector
  // session per process to capture local variable values on stack frames,
  // which added ~10s to a cold Turbopack dev compile and would add real
  // cold-start latency to every serverless function invocation in Vercel
  // production. Not worth that trade-off for a nice-to-have on top of the
  // stack trace + message Sentry already captures without it.
});
