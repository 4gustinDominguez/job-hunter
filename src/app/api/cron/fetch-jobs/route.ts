import { NextResponse } from "next/server";
import { recordIngestionRun } from "@/application";
import type { JobSearchCriteria } from "@/domain/search/search-profile";
import {
  analyzePendingJobs,
  ingestionRunRepository,
  ingestJobs,
  prefilterJobs,
  searchProfileRepository,
} from "@/app/_lib/container";
import { criteriaFromProfile } from "@/app/_lib/search-criteria";
import { beginCronCheckIn, finishCronCheckIn } from "@/app/_lib/sentry-cron";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // The standing fetch criteria: the OLDEST search profile (createdAt asc).
  // Without one, ingest runs unfiltered — same behaviour as the UI's
  // "All jobs (no filters)" option.
  const [activeProfile] = await searchProfileRepository.list();
  const criteria: JobSearchCriteria = activeProfile
    ? criteriaFromProfile(activeProfile)
    : { keywords: [] };
  const profileLabel = activeProfile ? activeProfile.name : "none";

  // Sentry cron monitor: in_progress → ok/error. Detects a *missed* run (a
  // dead cron writes no ingestion_runs row, so the table alone can't tell).
  const checkInId = beginCronCheckIn();
  const startedAt = Date.now();
  try {
    // recordIngestionRun leaves a row per attempt (phase 11): the dashboard's
    // "last run" line reads it instead of the user digging through Vercel logs.
    const summary = await recordIngestionRun(ingestionRunRepository, "cron", async () => {
      const ingest = await ingestJobs.run(criteria);
      const prefilter = await prefilterJobs.run();
      const analysis = await analyzePendingJobs.run();
      for (const error of ingest.errors) {
        console.error(`[cron] ingest error — ${error.source}: ${error.message}`);
      }
      for (const error of analysis.errors) {
        console.error(`[cron] analysis error — ${error.title}: ${error.message}`);
      }
      return {
        fetched: ingest.fetched,
        created: ingest.created,
        attached: ingest.attached,
        skipped: ingest.skipped,
        prefilterQueued: prefilter.pending,
        prefilterSkipped: prefilter.skipped,
        analyzed: analysis.analyzed,
        strong: analysis.strong,
        potential: analysis.potential,
        weak: analysis.weak,
        none: analysis.none,
        failed: analysis.failed,
        errors: [
          ...ingest.errors.map((error) => ({
            stage: "ingest" as const,
            source: error.source,
            message: error.message,
          })),
          ...analysis.errors.map((error) => ({
            stage: "analysis" as const,
            message: `${error.title}: ${error.message}`,
          })),
        ],
      };
    });

    // One structured summary line per run — the only way to see cron health in
    // Vercel runtime logs at a glance (no PII: counts and error texts only).
    console.log(
      `[cron] profile: ${profileLabel} · ingest: fetched ${summary.fetched} · created ${summary.created} · attached ${summary.attached} · skipped ${summary.skipped} · errors ${(summary.errors ?? []).filter((error) => error.stage === "ingest").length} | prefilter: queued ${summary.prefilterQueued ?? 0} · skipped ${summary.prefilterSkipped ?? 0} | analysis: analyzed ${summary.analyzed ?? 0} · strong ${summary.strong ?? 0} · potential ${summary.potential ?? 0} · weak ${summary.weak ?? 0} · none ${summary.none ?? 0} · failed ${summary.failed ?? 0}`,
    );
    // A run with per-source errors still "completed" — report ok so the monitor
    // doesn't fire on a flaky source; the errors are on the Sentry events.
    finishCronCheckIn(checkInId, true, Date.now() - startedAt);
    return NextResponse.json({
      ingest: {
        fetched: summary.fetched,
        created: summary.created,
        attached: summary.attached,
        skipped: summary.skipped,
        errors: (summary.errors ?? []).filter((error) => error.stage === "ingest"),
      },
      prefilter: { queued: summary.prefilterQueued ?? 0, skipped: summary.prefilterSkipped ?? 0 },
      analysis: {
        analyzed: summary.analyzed ?? 0,
        strong: summary.strong ?? 0,
        potential: summary.potential ?? 0,
        weak: summary.weak ?? 0,
        none: summary.none ?? 0,
        failed: summary.failed ?? 0,
        errors: (summary.errors ?? []).filter((error) => error.stage === "analysis"),
      },
    });
  } catch (error) {
    // Hard failure (ingest/prefilter/analysis threw): report error to the
    // monitor, then rethrow so Vercel records the failed invocation too.
    finishCronCheckIn(checkInId, false, Date.now() - startedAt);
    throw error;
  }
}
