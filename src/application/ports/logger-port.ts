/**
 * Logging port (hexagonal). The app logs deliberately — a call site decides to
 * emit `info`/`warn`/`error` — and the concrete sink (today Sentry Logs) is an
 * infrastructure adapter chosen at the composition root. Swapping the backend
 * (Sentry → Axiom/Datadog/console) touches only the adapter, never call sites.
 *
 * Levels map to Sentry's log levels (info/warn/error); kept to the three this
 * app uses so the surface stays minimal.
 *
 * **No-PII contract**: context values are metadata only (provider, model,
 * durations, counts, status). Never CV text, job descriptions, profile data or
 * generated documents.
 */
export type LogLevel = "info" | "warn" | "error";

/** Structured metadata attached to a log line. Values must be PII-free. */
export type LogContext = Record<string, string | number | boolean>;

export interface LoggerPort {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

/** Drops every log. Default for tests and for when no sink is configured. */
export const NOOP_LOGGER: LoggerPort = {
  info() {},
  warn() {},
  error() {},
};
