import { analyzePendingJobs, prefilterJobs } from "../src/app/_lib/container";

async function main(): Promise<void> {
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
