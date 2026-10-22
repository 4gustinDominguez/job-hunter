import { beforeEach, describe, expect, it } from "vitest";
import { AnalyzeJobFit } from "@/application/matching/analyze-job-fit";
import { NotFoundError, ValidationError } from "@/application/errors";
import type { JobAnalysis } from "@/domain/matching/job-analysis";
import { InMemoryAnalysisRepository } from "../../support/in-memory/in-memory-analysis-repository";
import { InMemoryCandidateProfileRepository } from "../../support/in-memory/in-memory-candidate-profile-repository";
import { InMemoryJobRepository } from "../../support/in-memory/in-memory-job-repository";
import { makeJob } from "../../support/make-job";
import { makeProfile } from "../../support/make-profile";

const ANALYSIS: JobAnalysis = {
  classification: "STRONG",
  matched: [{ skill: "TypeScript", candidateLevel: "EXPERT", status: "matched" }],
  gaps: ["Kubernetes"],
  unknowns: [],
  experience: ["Strong full-stack background"],
  location: ["Remote OK"],
  salary: [],
  reasoning: "Core stack matches; one learnable gap.",
};

class StubMatcher {
  readonly provider = "stub";
  readonly model = "stub-model";
  calls = 0;

  async analyze(): Promise<JobAnalysis> {
    this.calls += 1;
    return ANALYSIS;
  }
}

describe("AnalyzeJobFit", () => {
  let jobs: InMemoryJobRepository;
  let profiles: InMemoryCandidateProfileRepository;
  let analyses: InMemoryAnalysisRepository;
  let matcher: StubMatcher;
  let useCase: AnalyzeJobFit;

  beforeEach(async () => {
    jobs = new InMemoryJobRepository();
    profiles = new InMemoryCandidateProfileRepository();
    analyses = new InMemoryAnalysisRepository();
    matcher = new StubMatcher();
    useCase = new AnalyzeJobFit(matcher, jobs, profiles, analyses);
    await profiles.save(makeProfile());
  });

  it("saves the analysis, stamps provider/model and marks the job done", async () => {
    const job = makeJob();
    await jobs.save(job, "company-1");

    const record = await useCase.run(job.id);

    expect(record.jobId).toBe(job.id);
    expect(record.provider).toBe("stub");
    expect(record.model).toBe("stub-model");
    expect(record.analysis.classification).toBe("STRONG");
    expect(await analyses.get(job.id)).not.toBeNull();
    const stored = await jobs.getById(job.id);
    expect(stored?.analysisState).toBe("done");
  });

  it("overwrites a previous analysis on re-analyze", async () => {
    const job = makeJob();
    await jobs.save(job, "company-1");
    await useCase.run(job.id);
    await useCase.run(job.id);

    expect(matcher.calls).toBe(2);
    expect(await analyses.get(job.id)).not.toBeNull();
  });

  it("fails with ValidationError when no profile exists", async () => {
    const emptyProfiles = new InMemoryCandidateProfileRepository();
    const useCaseNoProfile = new AnalyzeJobFit(matcher, jobs, emptyProfiles, analyses);
    const job = makeJob();
    await jobs.save(job, "company-1");

    await expect(useCaseNoProfile.run(job.id)).rejects.toThrowError(ValidationError);
  });

  it("fails with NotFoundError for an unknown job", async () => {
    await expect(useCase.run("missing")).rejects.toThrowError(NotFoundError);
  });
});
