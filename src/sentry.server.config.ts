import * as Sentry from "@sentry/nextjs";

/**
 * Sentry server-side init, loaded from `src/instrumentation.ts` (Next 16
 * convention — `sentry.*.config.ts` is the retired v7/v8 layout). Errors are
 * the whole point of Phase 11: after Vercel's 1-hour Hobby log window, this
 * is the only 30-day record of "what broke last night".
 *
 * Disabled entirely when SENTRY_DSN is unset (local dev, tests) — no network,
 * no side effects. Privacy is hard (harder than the old sendDefaultPii flag):
 * v11's `dataCollection` lets us switch off every PII-bearing category
 * individually. Never attach CV text, job descriptions, profile payloads or
 * generated documents — the app never passes them here, and the collectors
 * that could scoop them up (DB query data, stack-frame locals) are off.
 */

/** Query strings can carry ids/filenames; keep only the path for grouping. */
function stripQuery(url: string | undefined): string | undefined {
  if (!url) return url;
  const questionMark = url.indexOf("?");
  return questionMark === -1 ? url : url.slice(0, questionMark);
}

export function createSentryOptions(): Sentry.NodeOptions {
  return {
    dsn: process.env.SENTRY_DSN,
    // No DSN (local dev, tests) → SDK is a no-op: no network, no side effects.
    enabled: Boolean(process.env.SENTRY_DSN),
    environment: process.env.VERCEL_ENV ?? "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    // Cost + noise control: error events only, no performance spans.
    tracesSampleRate: 0,
    // v11 granular PII kill-switch — every category that could carry user or
    // candidate data is off. Structural error context (message, stack, route)
    // still ships.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      // DB statements could embed job/profile rows — keep only the error.
      databaseQueryData: false,
      // Local variables in stack frames can hold CV/profile content in scope.
      stackFrameVariables: false,
    },
    // Belt-and-suspenders: strip query strings from any URL that still ships.
    beforeSend(event) {
      if (event.request) {
        event.request.url = stripQuery(event.request.url);
        delete event.request.data;
        delete event.request.headers;
        delete event.request.cookies;
      }
      return event;
    },
  };
}

// Initialize on import (the `register()` caller awaits this module).
Sentry.init(createSentryOptions());
