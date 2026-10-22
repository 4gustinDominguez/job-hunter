import type { JobRepositoryPort } from "@/application/ports/job-repository-port";
import type { Job } from "@/domain/job/job";

export class GetJob {
  constructor(private readonly jobs: JobRepositoryPort) {}

  async run(id: string): Promise<Job | null> {
    return this.jobs.getById(id);
  }
}
