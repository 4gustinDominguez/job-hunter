/* oxlint-disable no-await-in-loop -- state updates are sequential by contract */
import type { CandidateProfileRepositoryPort } from "@/application/ports/candidate-profile-repository-port";
import type { JobRepositoryPort } from "@/application/ports/job-repository-port";
import { prefilterJob } from "./prefilter";

export interface PrefilterJobsResult {
  checked: number;
  pending: number;
  skipped: number;
  hasProfile: boolean;
}

/**
 * Marks jobs the local prefilter deems worth an LLM analysis as `pending`.
 * Only jobs in state `none` are evaluated (pending/done/failed are left alone;
 * skipped ones stay `none` so a future run re-evaluates them against a fresher
 * profile).
 */
export class PrefilterJobs {
  constructor(
    private readonly jobs: JobRepositoryPort,
    private readonly profiles: CandidateProfileRepositoryPort,
  ) {}

  async run(): Promise<PrefilterJobsResult> {
    const profile = await this.profiles.findFirst();
    if (!profile) {
      return { checked: 0, pending: 0, skipped: 0, hasProfile: false };
    }

    const candidates = await this.jobs.listByAnalysisState("none");
    let pending = 0;
    let skipped = 0;
    for (const job of candidates) {
      if (prefilterJob(job, profile).pass) {
        await this.jobs.setAnalysisState(job.id, "pending");
        pending += 1;
      } else {
        skipped += 1;
      }
    }
    return { checked: candidates.length, pending, skipped, hasProfile: true };
  }
}
