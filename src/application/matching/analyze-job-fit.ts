import type { AnalysisRepositoryPort } from "@/application/ports/analysis-repository-port";
import type { CandidateProfileRepositoryPort } from "@/application/ports/candidate-profile-repository-port";
import type { JobMatcherPort } from "@/application/ports/job-matcher-port";
import type { JobRepositoryPort } from "@/application/ports/job-repository-port";
import { NotFoundError, ValidationError } from "@/application/errors";
import type { JobAnalysisRecord } from "@/application/ports/analysis-repository-port";

export class AnalyzeJobFit {
  constructor(
    private readonly matcher: JobMatcherPort,
    private readonly jobs: JobRepositoryPort,
    private readonly profiles: CandidateProfileRepositoryPort,
    private readonly analyses: AnalysisRepositoryPort,
  ) {}

  async run(jobId: string): Promise<JobAnalysisRecord> {
    const job = await this.jobs.getById(jobId);
    if (!job) {
      throw new NotFoundError("Job", jobId);
    }
    const profile = await this.profiles.findFirst();
    if (!profile) {
      throw new ValidationError(
        "profile",
        "No candidate profile found. Create or import one before analyzing fit.",
      );
    }

    const analysis = await this.matcher.analyze(job, profile);
    const record = {
      analysis,
      provider: this.matcher.provider,
      model: this.matcher.model,
      createdAt: new Date(),
    };
    await this.analyses.save(jobId, record);
    await this.jobs.setAnalysisState(jobId, "done");
    return { jobId, ...record };
  }
}
