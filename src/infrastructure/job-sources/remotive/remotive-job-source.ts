import type { JobSourcePort } from "@/application/ports/job-source-port";
import type { Job } from "@/domain/job/job";
import type { JobSearchCriteria } from "@/domain/search/search-profile";
import { applyCommonFilters } from "../filters";
import { RemotiveClient } from "./remotive-client";
import { mapRemotiveJob } from "./remotive-mapper";

export class RemotiveJobSource implements JobSourcePort {
  readonly type = "REMOTIVE" as const;

  constructor(private readonly client = new RemotiveClient()) {}

  async search(criteria: JobSearchCriteria): Promise<Job[]> {
    const query = criteria.keywords.join(" ").trim();
    const found = await this.client.fetchJobs(query === "" ? undefined : query);
    const discoveredAt = new Date();
    const jobs = found
      .filter((job) => typeof job.id === "number" && typeof job.url === "string")
      .map((job) => mapRemotiveJob(job, discoveredAt));
    return applyCommonFilters(jobs, criteria);
  }
}
