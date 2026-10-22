import type {
  AnalysisRepositoryPort,
  JobAnalysisRecord,
} from "@/application/ports/analysis-repository-port";

export class InMemoryAnalysisRepository implements AnalysisRepositoryPort {
  private readonly records = new Map<string, JobAnalysisRecord>();

  async get(jobId: string): Promise<JobAnalysisRecord | null> {
    return this.records.get(jobId) ?? null;
  }

  async getMany(jobIds: string[]): Promise<Map<string, JobAnalysisRecord>> {
    const map = new Map<string, JobAnalysisRecord>();
    for (const jobId of jobIds) {
      const record = this.records.get(jobId);
      if (record) map.set(jobId, record);
    }
    return map;
  }

  async save(jobId: string, record: Omit<JobAnalysisRecord, "jobId">): Promise<void> {
    this.records.set(jobId, { jobId, ...record });
  }
}
