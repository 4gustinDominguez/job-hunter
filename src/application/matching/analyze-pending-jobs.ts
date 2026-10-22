/* oxlint-disable no-await-in-loop -- batch analyses are sequential by contract (one LLM call at a time) */
import type { AnalysisRepositoryPort } from "@/application/ports/analysis-repository-port";
import type { CandidateProfileRepositoryPort } from "@/application/ports/candidate-profile-repository-port";
import type { JobRepositoryPort } from "@/application/ports/job-repository-port";
import { AnalyzeJobFit } from "./analyze-job-fit";

export interface AnalyzePendingJobsResult {
  analyzed: number;
  failed: number;
  strong: number;
  potential: number;
  weak: number;
  none: number;
  errors: Array<{ jobId: string; title: string; message: string }>;
}

const DEFAULT_BATCH_SIZE = 25;

/**
 * Batch-runs the LLM analysis over jobs the prefilter marked `pending`.
 * Bounded per run (free-tier/local models): leftovers stay pending for the
 * next run; one failing job never aborts the batch.
 */
export class AnalyzePendingJobs {
  constructor(
    private readonly analyzeJobFit: AnalyzeJobFit,
    private readonly jobs: JobRepositoryPort,
    private readonly profiles: CandidateProfileRepositoryPort,
    private readonly analyses: AnalysisRepositoryPort,
    private readonly batchSize = Number(process.env.ANALYZE_BATCH_SIZE ?? DEFAULT_BATCH_SIZE),
  ) {}

  async run(): Promise<AnalyzePendingJobsResult> {
    const result: AnalyzePendingJobsResult = {
      analyzed: 0,
      failed: 0,
      strong: 0,
      potential: 0,
      weak: 0,
      none: 0,
      errors: [],
    };

    const profile = await this.profiles.findFirst();
    if (!profile) {
      return result;
    }

    const pending = await this.jobs.listByAnalysisState("pending", this.batchSize);
    for (const job of pending) {
      try {
        const record = await this.analyzeJobFit.run(job.id);
        result.analyzed += 1;
        const classification = record.analysis.classification.toLowerCase();
        if (classification === "strong") result.strong += 1;
        else if (classification === "potential") result.potential += 1;
        else if (classification === "weak") result.weak += 1;
        else result.none += 1;
      } catch (error) {
        await this.jobs.setAnalysisState(job.id, "failed");
        result.failed += 1;
        result.errors.push({
          jobId: job.id,
          title: job.title,
          message: error instanceof Error ? error.message : String(error),
        });
        console.warn(
          `[analyze] job ${job.id} failed:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
    return result;
  }
}
