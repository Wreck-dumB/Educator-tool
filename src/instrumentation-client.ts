import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% in dev, 10% in production — enough to catch real perf issues
  // without shipping every single request's trace data.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Session Replay and other richer signals deliberately not enabled yet —
  // this app handles real children's health/medical/compliance data, and
  // replay recording needs careful privacy-masking configuration before
  // it's safe to turn on, not a default-on toggle. Errors + tracing first.
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
