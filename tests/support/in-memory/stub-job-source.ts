import type { JobSourcePort } from "@/application/ports/job-source-port";
import type { JobSourceType } from "@/domain/job/enums";
import type { Job } from "@/domain/job/job";
import type { JobSearchCriteria } from "@/domain/search/search-profile";

export class StubJobSource implements JobSourcePort {
  lastCriteria: JobSearchCriteria | null = null;

  constructor(
    private readonly jobs: Job[],
    readonly type: JobSourceType = "FIXTURE",
  ) {}

  async search(criteria: JobSearchCriteria): Promise<Job[]> {
    this.lastCriteria = criteria;
    return this.jobs.map((job) => ({ ...job }));
  }
}

export class FailingJobSource implements JobSourcePort {
  constructor(readonly type: JobSourceType = "REMOTIVE") {}

  async search(): Promise<Job[]> {
    throw new Error("boom: rate limited");
  }
}
