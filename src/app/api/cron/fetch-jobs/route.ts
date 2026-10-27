import { NextResponse } from "next/server";
import type { JobSearchCriteria } from "@/domain/search/search-profile";
import {
  analyzePendingJobs,
  ingestJobs,
  prefilterJobs,
  searchProfileRepository,
} from "@/app/_lib/container";
import { criteriaFromProfile } from "@/app/_lib/search-criteria";

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
  const ingest = await ingestJobs.run(criteria);
  const prefilter = await prefilterJobs.run();
  const analysis = await analyzePendingJobs.run();
  // One structured summary line per run — the only way to see cron health in
  // Vercel runtime logs at a glance (no PII: counts and error texts only).
  console.log(
    `[cron] profile: ${profileLabel} · ingest: fetched ${ingest.fetched} · created ${ingest.created} · attached ${ingest.attached} · skipped ${ingest.skipped} · errors ${ingest.errors.length} | prefilter: queued ${prefilter.pending} · skipped ${prefilter.skipped} | analysis: analyzed ${analysis.analyzed} · strong ${analysis.strong} · potential ${analysis.potential} · weak ${analysis.weak} · none ${analysis.none} · failed ${analysis.failed}`,
  );
  for (const error of ingest.errors) {
    console.error(`[cron] ingest error — ${error.source}: ${error.message}`);
  }
  for (const error of analysis.errors) {
    console.error(`[cron] analysis error — ${error.title}: ${error.message}`);
  }
  return NextResponse.json({ ingest, prefilter, analysis });
}
