import * as Sentry from "@sentry/node";
import { env } from "./env.js";

export function initSentry() {
  if (!env.sentryDsn) {
    return false;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.sentryEnvironment,
    tracesSampleRate: env.sentryTracesSampleRate,
  });

  return true;
}

export function captureException(error, context = {}) {
  if (!env.sentryDsn) return;
  Sentry.captureException(error, { extra: context });
}
