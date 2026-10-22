import type { JobFilter } from "@/application/jobs/job-filter";
import type { AnalysisState } from "@/domain/matching/job-analysis";
import type { Job } from "@/domain/job/job";
import type { JobSourceType } from "@/domain/job/enums";

export interface JobRepositoryPort {
  getById(id: string): Promise<Job | null>;
  list(filter?: JobFilter): Promise<Job[]>;
  findByUrl(url: string): Promise<Job | null>;
  findBySourceAndExternalId(source: JobSourceType, externalId: string): Promise<Job | null>;
  findByContentKey(contentKey: string): Promise<Job[]>;
  listListings(jobId: string): Promise<Job[]>;
  listByAnalysisState(state: AnalysisState, limit?: number): Promise<Job[]>;
  save(job: Job, companyId: string): Promise<Job>;
  attachListing(jobId: string, job: Job): Promise<void>;
  updateNotes(jobId: string, notes: string[]): Promise<void>;
  setAnalysisState(jobId: string, state: AnalysisState): Promise<void>;
}
