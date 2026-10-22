import type { JobRepositoryPort } from "@/application/ports/job-repository-port";
import type { JobFilter } from "@/application/jobs/job-filter";
import type { Job } from "@/domain/job/job";

export class ListJobs {
  constructor(private readonly jobs: JobRepositoryPort) {}

  async run(filter: JobFilter = {}): Promise<Job[]> {
    return this.jobs.list({
      ...filter,
      query: filter.query?.trim() || undefined,
      location: filter.location?.trim() || undefined,
    });
  }
}
