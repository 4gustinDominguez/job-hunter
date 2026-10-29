import * as Sentry from "@sentry/nextjs";
import type { LoggerPort, LogContext } from "@/application/ports/logger-port";

/**
 * Sentry Logs adapter (the only file that knows Sentry's logging API). Log
 * entries show up in Sentry → Explore → Logs, filterable by level, with 30-day
 * retention on the free plan (5 GB/mo included; beyond that free accounts drop
 * rather than bill).
 *
 * Deliberately a no-op when SENTRY_DSN is unset, mirroring the rest of the
 * observability stack: local dev and tests emit nothing. Swap this class alone
 * to change the backend — LoggerPort and all call sites stay put (this is the
 * integration point most likely to change over time).
 */
export class SentryLogger implements LoggerPort {
  constructor(private readonly enabled = Boolean(process.env.SENTRY_DSN)) {}

  info(message: string, context?: LogContext): void {
    if (!this.enabled) return;
    Sentry.logger.info(message, context);
  }

  warn(message: string, context?: LogContext): void {
    if (!this.enabled) return;
    Sentry.logger.warn(message, context);
  }

  error(message: string, context?: LogContext): void {
    if (!this.enabled) return;
    Sentry.logger.error(message, context);
  }
}
