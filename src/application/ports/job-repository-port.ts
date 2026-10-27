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
  /** One lookup per batch: canonical url → job id for the urls that exist. */
  findJobIdsByCanonicalUrls(canonicalUrls: string[]): Promise<Map<string, string>>;
  /** One lookup per batch: external id → job id within the source. */
  findJobIdsByExternalIds(
    source: JobSourceType,
    externalIds: string[],
  ): Promise<Map<string, string>>;
  /** One lookup per batch: every job matching any of the content keys. */
  findByContentKeys(contentKeys: string[]): Promise<Job[]>;
  listListings(jobId: string): Promise<Job[]>;
  listByAnalysisState(state: AnalysisState, limit?: number): Promise<Job[]>;
  save(job: Job, companyId: string): Promise<Job>;
  /** Bulk insert (jobs + listings) in chunked, transactional batches. */
  saveMany(entries: { job: Job; companyId: string }[]): Promise<void>;
  attachListing(jobId: string, job: Job): Promise<void>;
  updateNotes(jobId: string, notes: string[]): Promise<void>;
  setAnalysisState(jobId: string, state: AnalysisState): Promise<void>;
  /** Funnel: mark/unmark a job as "not interested" (dismissed_at). */
  setDismissed(jobId: string, dismissed: boolean): Promise<void>;
}
