/**
 * Sentry browser/client-side initialisation.
 * This file is loaded automatically by the @sentry/nextjs instrumentation hook.
 * When NEXT_PUBLIC_SENTRY_DSN is not set the init call is a no-op.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? "uat",
    tracesSampleRate: 0.1,
    // Replay is opt-in — enable when explicitly required
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Do not send PII by default
    sendDefaultPii: false,
  });
}
