import type { JobAnalysis } from "@/domain/matching/job-analysis";

export interface JobAnalysisRecord {
  jobId: string;
  analysis: JobAnalysis;
  provider: string;
  model: string;
  createdAt: Date;
}

export interface AnalysisRepositoryPort {
  get(jobId: string): Promise<JobAnalysisRecord | null>;
  getMany(jobIds: string[]): Promise<Map<string, JobAnalysisRecord>>;
  save(jobId: string, record: Omit<JobAnalysisRecord, "jobId">): Promise<void>;
}
