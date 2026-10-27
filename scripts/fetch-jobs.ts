import { ingestJobs, prefilterJobs } from "../src/app/_lib/container";
import { envEnabledSources } from "../src/infrastructure/settings/env-defaults";

async function main(): Promise<void> {
  const enabled = [...envEnabledSources()].join(", ") || "(none)";
  console.log(`Fetching jobs from enabled sources (${enabled})…`);

  const result = await ingestJobs.run({ keywords: [] });
  console.log(
    `Fetched ${result.fetched} · ${result.created} new · ${result.attached} matched an existing job · ${result.skipped} already known.`,
  );

  const prefilter = await prefilterJobs.run();
  if (prefilter.hasProfile) {
    console.log(
      `Prefilter: checked ${prefilter.checked} · ${prefilter.pending} queued for analysis · ${prefilter.skipped} skipped.`,
    );
  } else {
    console.log("Prefilter: no candidate profile found — nothing to compare against.");
  }

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(`  [${error.source}] ${error.message}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
