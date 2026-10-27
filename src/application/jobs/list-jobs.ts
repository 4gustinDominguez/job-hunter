import type { JobRepositoryPort } from "@/application/ports/job-repository-port";
import type { JobFilter } from "@/application/jobs/job-filter";
import type { Job } from "@/domain/job/job";

function normalizeFilter(filter: JobFilter): JobFilter {
  return {
    ...filter,
    query: filter.query?.trim() || undefined,
    location: filter.location?.trim() || undefined,
  };
}

export class ListJobs {
  constructor(private readonly jobs: JobRepositoryPort) {}

  async run(filter: JobFilter = {}): Promise<Job[]> {
    return this.jobs.list(normalizeFilter(filter));
  }

  /** Server-side page (filters + count + limit/offset all in SQL). */
  async page(
    filter: JobFilter = {},
    pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
  ): Promise<{ jobs: Job[]; total: number }> {
    return this.jobs.listPage(normalizeFilter(filter), pagination);
  }
}
