import * as Sentry from "@sentry/nextjs";

/**
 * Cron-monitor check-ins for Sentry (Phase 11). The daily Vercel cron posts an
 * `in_progress` check-in when it starts and a matching `ok`/`error` when it
 * finishes, so Sentry can alert on a *missed* run — something the
 * `ingestion_runs` table can't detect on its own (a dead cron writes no row).
 *
 * No-op when SENTRY_DSN is unset (local dev / tests). The monitor slug is
 * stable; Sentry upserts the monitor config (schedule + thresholds) from the
 * first check-in, so no manual monitor creation is required.
 */

export const CRON_MONITOR_SLUG = "daily-job-fetch";

/** Matches vercel.json: `0 9 * * *`. Sentry uses this to detect missed runs. */
const SCHEDULE = { schedule: { type: "crontab", value: "0 9 * * *" } } as const;

/** Start a check-in; returns the id to pass to finishCronCheckIn, or null. */
export function beginCronCheckIn(): string | null {
  if (!process.env.SENTRY_DSN) return null;
  return Sentry.captureCheckIn(
    { monitorSlug: CRON_MONITOR_SLUG, status: "in_progress" },
    {
      ...SCHEDULE,
      timezone: "UTC",
      // Cron fires at 09:00 UTC; allow up to 09:15 before flagging a miss.
      checkinMargin: 15,
      // A run shouldn't exceed 25 min (Hobby functions cap at 300s = 5 min per
      // invocation, but the batch chain can be long); flag runaway runs.
      maxRuntime: 25,
      failureIssueThreshold: 1,
      recoveryThreshold: 1,
    },
  );
}

/** Close the check-in started by beginCronCheckIn. Safe no-op on a null id. */
export function finishCronCheckIn(checkInId: string | null, ok: boolean, durationMs: number): void {
  if (!checkInId) return;
  Sentry.captureCheckIn({
    monitorSlug: CRON_MONITOR_SLUG,
    status: ok ? "ok" : "error",
    checkInId,
    duration: Math.round(durationMs / 1000),
  });
}
