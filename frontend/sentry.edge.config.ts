/**
 * Sentry edge-runtime initialisation (Next.js middleware).
 * This file is loaded automatically by the @sentry/nextjs instrumentation hook.
 * When SENTRY_DSN is not set the init call is a no-op.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? "uat",
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
