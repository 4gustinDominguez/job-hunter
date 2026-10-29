/**
 * Next 16 instrumentation (stable since Next 15 — no experimental flag).
 * Loaded once per server instance before it accepts requests. This is where
 * Sentry boots on the server; the client is intentionally not instrumented
 * yet (every failure we care about — cron, CV extraction, ingestion, LLM
 * calls, DB — is server-side). See progress/phase-11-observability.md.
 *
 * Gated on NEXT_RUNTIME so the Node-only Sentry config never loads on the
 * edge runtime (src/proxy.ts runs there and must stay dependency-light).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SENTRY_DSN) {
    await import("./sentry.server.config");
  }
}

/** Report server request errors (SSR, route handlers, server actions) to Sentry. */
export const onRequestError: import("next").Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (!process.env.SENTRY_DSN) return;
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(error, request, context);
};
