import * as Sentry from "@sentry/nextjs";
import { analyzePendingJobs, prefilterJobs } from "../src/app/_lib/container";

async function main(): Promise<void> {
  // The script runs as a bare node process (pnpm analyze-jobs), so Next's
  // instrumentation.ts register() never fires here and Sentry is never booted.
  // Init it manually (no-op without SENTRY_DSN) so the LLM-call logs that
  // LoggedChat emits actually reach Sentry instead of vanishing. Must run
  // before any analysis call.
  if (process.env.SENTRY_DSN) {
    await import("../src/sentry.server.config");
  }

  const prefilter = await prefilterJobs.run();
  if (prefilter.hasProfile) {
    console.log(
      `Prefilter: checked ${prefilter.checked} · ${prefilter.pending} queued for analysis · ${prefilter.skipped} skipped as irrelevant.`,
    );
  } else {
    console.log("Prefilter: no candidate profile found — nothing to compare against.");
  }

  const result = await analyzePendingJobs.run();
  console.log(
    `Analyzed ${result.analyzed} · strong ${result.strong} · potential ${result.potential} · weak ${result.weak} · none ${result.none} · failed ${result.failed}.`,
  );
  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(`  [${error.title}] ${error.message}`);
    }
    process.exitCode = 1;
  }

  // Sentry ships logs/events in async batches; this process is short-lived, so
  // flush before exiting or the [ai] call logs never leave the box. No-op
  // without SENTRY_DSN.
  if (process.env.SENTRY_DSN) {
    await Sentry.flush(5000);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
