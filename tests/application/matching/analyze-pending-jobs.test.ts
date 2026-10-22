/* oxlint-disable no-await-in-loop -- sequential seeding mirrors production order */
import { beforeEach, describe, expect, it } from "vitest";
import { AnalyzeJobFit } from "@/application/matching/analyze-job-fit";
import { AnalyzePendingJobs } from "@/application/matching/analyze-pending-jobs";
import { AnalysisError } from "@/application/errors";
import type { JobAnalysis } from "@/domain/matching/job-analysis";
import { InMemoryAnalysisRepository } from "../../support/in-memory/in-memory-analysis-repository";
import { InMemoryCandidateProfileRepository } from "../../support/in-memory/in-memory-candidate-profile-repository";
import { InMemoryJobRepository } from "../../support/in-memory/in-memory-job-repository";
import { makeJob } from "../../support/make-job";
import { makeProfile } from "../../support/make-profile";

function analysisOf(classification: JobAnalysis["classification"]): JobAnalysis {
  return {
    classification,
    matched: [],
    gaps: [],
    unknowns: [],
    experience: [],
    location: [],
    salary: [],
    reasoning: `${classification} per stub`,
  };
}

class StubMatcher {
  readonly provider = "stub";
  readonly model = "stub-model";

  constructor(private readonly plan: Array<JobAnalysis | Error>) {}

  async analyze(): Promise<JobAnalysis> {
    const next = this.plan.shift();
    if (next === undefined) throw new Error("StubMatcher: empty plan");
    if (next instanceof Error) throw next;
    return next;
  }
}

describe("AnalyzePendingJobs", () => {
  let jobs: InMemoryJobRepository;
  let profiles: InMemoryCandidateProfileRepository;
  let analyses: InMemoryAnalysisRepository;

  beforeEach(async () => {
    jobs = new InMemoryJobRepository();
    profiles = new InMemoryCandidateProfileRepository();
    analyses = new InMemoryAnalysisRepository();
    await profiles.save(makeProfile());
  });

  async function seedPending(count: number): Promise<string[]> {
    const ids: string[] = [];
    for (let index = 0; index < count; index++) {
      const job = makeJob({
        id: `job-${index}`,
        externalId: `ext-${index}`,
        url: `https://jobs.example/${index}`,
        title: `Role ${index}`,
        company: { id: `c-${index}`, name: `Company ${index}` },
        description: "Some description",
        analysisState: "pending",
      });
      await jobs.save(job, `company-${index}`);
      ids.push(job.id);
    }
    return ids;
  }

  it("analyzes pending jobs and aggregates classification counts", async () => {
    await seedPending(3);
    const matcher = new StubMatcher([
      analysisOf("STRONG"),
      analysisOf("POTENTIAL"),
      analysisOf("WEAK"),
    ]);
    const useCase = new AnalyzePendingJobs(
      new AnalyzeJobFit(matcher, jobs, profiles, analyses),
      jobs,
      profiles,
      analyses,
      10,
    );

    const result = await useCase.run();

    expect(result).toMatchObject({
      analyzed: 3,
      failed: 0,
      strong: 1,
      potential: 1,
      weak: 1,
      none: 0,
    });
    expect(await jobs.listByAnalysisState("pending")).toHaveLength(0);
  });

  it("marks failures, keeps the batch going and records errors", async () => {
    await seedPending(2);
    const matcher = new StubMatcher([new AnalysisError("model exploded"), analysisOf("STRONG")]);
    const useCase = new AnalyzePendingJobs(
      new AnalyzeJobFit(matcher, jobs, profiles, analyses),
      jobs,
      profiles,
      analyses,
      10,
    );

    const result = await useCase.run();

    expect(result.analyzed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe("model exploded");
    const failed = await jobs.listByAnalysisState("failed");
    expect(failed).toHaveLength(1);
    const done = await jobs.listByAnalysisState("done");
    expect(done).toHaveLength(1);
  });

  it("respects the batch size cap, leaving leftovers pending", async () => {
    await seedPending(3);
    const matcher = new StubMatcher([analysisOf("STRONG")]);
    const useCase = new AnalyzePendingJobs(
      new AnalyzeJobFit(matcher, jobs, profiles, analyses),
      jobs,
      profiles,
      analyses,
      1,
    );

    const result = await useCase.run();

    expect(result.analyzed).toBe(1);
    expect(await jobs.listByAnalysisState("pending")).toHaveLength(2);
  });

  it("does nothing without a profile", async () => {
    await seedPending(1);
    const emptyProfiles = new InMemoryCandidateProfileRepository();
    const matcher = new StubMatcher([analysisOf("STRONG")]);
    const useCase = new AnalyzePendingJobs(
      new AnalyzeJobFit(matcher, jobs, emptyProfiles, analyses),
      jobs,
      emptyProfiles,
      analyses,
      10,
    );

    const result = await useCase.run();

    expect(result.analyzed).toBe(0);
    expect(await jobs.listByAnalysisState("pending")).toHaveLength(1);
  });
});
