import type { JobSourcePort } from "@/application/ports/job-source-port";
import type { Job } from "@/domain/job/job";
import type { JobSearchCriteria } from "@/domain/search/search-profile";
import { applyCommonFilters } from "../filters";
import { ArbeitnowClient } from "./arbeitnow-client";
import { mapArbeitnowJob } from "./arbeitnow-mapper";

export class ArbeitnowJobSource implements JobSourcePort {
  readonly type = "ARBEITNOW" as const;

  constructor(private readonly client = new ArbeitnowClient()) {}

  async search(criteria: JobSearchCriteria): Promise<Job[]> {
    const found = await this.client.fetchJobs();
    const discoveredAt = new Date();
    const jobs = found
      .filter((job) => typeof job.slug === "string" && typeof job.url === "string")
      .map((job) => mapArbeitnowJob(job, discoveredAt));
    return applyCommonFilters(jobs, criteria);
  }
}
