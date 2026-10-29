import { NextResponse } from "next/server";
import { analyzePendingJobs, ingestJobs, prefilterJobs } from "@/app/_lib/container";
import { recordIngestionRun } from "@/app/_lib/ingestion-run";
import { beginCronCheckIn, finishCronCheckIn } from "@/app/_lib/sentry-cron";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const startedAt = new Date();
  // Sentry cron monitor: in_progress → ok/error. Detects a *missed* run (a
  // dead cron writes no ingestion_runs row, so the table alone can't tell).
  const checkInId = beginCronCheckIn();
  try {
    const ingest = await ingestJobs.run({ keywords: [] });
    const prefilter = await prefilterJobs.run();
    const analysis = await analyzePendingJobs.run();
    // One structured summary line per run — the only way to see cron health in
    // Vercel runtime logs at a glance (no PII: counts and error texts only).
    console.log(
      `[cron] ingest: fetched ${ingest.fetched} · created ${ingest.created} · attached ${ingest.attached} · skipped ${ingest.skipped} · errors ${ingest.errors.length} | prefilter: queued ${prefilter.pending} · skipped ${prefilter.skipped} | analysis: analyzed ${analysis.analyzed} · strong ${analysis.strong} · potential ${analysis.potential} · weak ${analysis.weak} · none ${analysis.none} · failed ${analysis.failed}`,
    );
    for (const error of ingest.errors) {
      console.error(`[cron] ingest error — ${error.source}: ${error.message}`);
    }
    for (const error of analysis.errors) {
      console.error(`[cron] analysis error — ${error.title}: ${error.message}`);
    }
    // Persist the run so the dashboard can answer "did the cron run?" without
    // digging through Vercel's 1-hour log window.
    await recordIngestionRun({
      trigger: "cron",
      startedAt,
      fetched: ingest.fetched,
      created: ingest.created,
      attached: ingest.attached,
      skipped: ingest.skipped,
      prefilterPending: prefilter.pending,
      prefilterSkipped: prefilter.skipped,
      analysisAnalyzed: analysis.analyzed,
      analysisFailed: analysis.failed,
      errors: [
        ...ingest.errors.map((error) => `${error.source}: ${error.message}`),
        ...analysis.errors.map((error) => `${error.title}: ${error.message}`),
      ],
    });
    // A run with per-source errors still "completed" — report ok so the monitor
    // doesn't fire on a flaky source; the errors are on the Sentry events.
    finishCronCheckIn(checkInId, true, Date.now() - startedAt.getTime());
    return NextResponse.json({ ingest, prefilter, analysis });
  } catch (error) {
    // Hard failure (ingest/prefilter/analysis threw): report error to the
    // monitor, then rethrow so Vercel records the failed invocation too.
    finishCronCheckIn(checkInId, false, Date.now() - startedAt.getTime());
    throw error;
  }
}
