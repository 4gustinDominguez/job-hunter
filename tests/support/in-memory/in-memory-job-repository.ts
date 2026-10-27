import type { JobFilter } from "@/application/jobs/job-filter";
import type { JobRepositoryPort } from "@/application/ports/job-repository-port";
import { canonicalizeUrl, jobContentKey } from "@/domain/job/dedup";
import type { AnalysisState } from "@/domain/matching/job-analysis";
import type { Job } from "@/domain/job/job";
import type { JobSourceType } from "@/domain/job/enums";
import { normalizeText } from "@/domain/shared/text";

export class InMemoryJobRepository implements JobRepositoryPort {
  private readonly canonical = new Map<string, Job>();
  private readonly listingsByJob = new Map<string, Job[]>();

  async getById(id: string): Promise<Job | null> {
    return this.canonical.get(id) ?? null;
  }

  async list(filter: JobFilter = {}): Promise<Job[]> {
    let result = [...this.canonical.values()];
    if (filter.includeDismissed !== true) {
      result = result.filter((job) => job.dismissedAt === undefined);
    }
    if (filter.query !== undefined) {
      const query = normalizeText(filter.query);
      result = result.filter(
        (job) =>
          normalizeText(job.title).includes(query) ||
          normalizeText(job.description).includes(query) ||
          normalizeText(job.company.name).includes(query),
      );
    }
    if (filter.location !== undefined) {
      const location = normalizeText(filter.location);
      result = result.filter((job) => {
        const parts = [job.location?.city, job.location?.region, job.location?.country]
          .filter((part): part is string => part !== undefined)
          .join(" ");
        return normalizeText(parts).includes(location);
      });
    }
    if (filter.remoteType !== undefined) {
      result = result.filter((job) => job.remoteType === filter.remoteType);
    }
    if (filter.employmentType !== undefined) {
      result = result.filter((job) => job.employmentType === filter.employmentType);
    }
    if (filter.source !== undefined) {
      const source = filter.source;
      result = result.filter((job) =>
        (this.listingsByJob.get(job.id) ?? []).some((listing) => listing.source === source),
      );
    }
    return result.toSorted((a, b) => b.discoveredAt.getTime() - a.discoveredAt.getTime());
  }

  async findByUrl(url: string): Promise<Job | null> {
    const target = canonicalizeUrl(url);
    for (const listings of this.listingsByJob.values()) {
      if (listings.some((listing) => canonicalizeUrl(listing.url) === target)) {
        return listings[0] ? (this.canonical.get(listings[0].id) ?? null) : null;
      }
    }
    return null;
  }

  async findBySourceAndExternalId(source: JobSourceType, externalId: string): Promise<Job | null> {
    for (const [jobId, listings] of this.listingsByJob) {
      if (
        listings.some((listing) => listing.source === source && listing.externalId === externalId)
      ) {
        return this.canonical.get(jobId) ?? null;
      }
    }
    return null;
  }

  async findByContentKey(contentKey: string): Promise<Job[]> {
    return [...this.canonical.values()].filter((job) => jobContentKey(job) === contentKey);
  }

  async findJobIdsByCanonicalUrls(canonicalUrls: string[]): Promise<Map<string, string>> {
    const wanted = new Set(canonicalUrls);
    const result = new Map<string, string>();
    for (const [jobId, listings] of this.listingsByJob) {
      for (const listing of listings) {
        const key = canonicalizeUrl(listing.url);
        if (wanted.has(key) && !result.has(key)) result.set(key, jobId);
      }
    }
    return result;
  }

  async findJobIdsByExternalIds(
    source: JobSourceType,
    externalIds: string[],
  ): Promise<Map<string, string>> {
    const wanted = new Set(externalIds);
    const result = new Map<string, string>();
    for (const [jobId, listings] of this.listingsByJob) {
      for (const listing of listings) {
        if (
          listing.source === source &&
          listing.externalId !== undefined &&
          wanted.has(listing.externalId) &&
          !result.has(listing.externalId)
        ) {
          result.set(listing.externalId, jobId);
        }
      }
    }
    return result;
  }

  async findByContentKeys(contentKeys: string[]): Promise<Job[]> {
    const wanted = new Set(contentKeys);
    return [...this.canonical.values()].filter((job) => wanted.has(jobContentKey(job)));
  }

  async listListings(jobId: string): Promise<Job[]> {
    const canonical = this.canonical.get(jobId);
    const listings = this.listingsByJob.get(jobId);
    if (!canonical || !listings) return [];
    const results: Job[] = [];
    for (const listing of listings) {
      results.push({
        ...canonical,
        source: listing.source,
        externalId: listing.externalId,
        url: listing.url,
        publishedAt: listing.publishedAt,
        discoveredAt: listing.discoveredAt,
      });
    }
    return results;
  }

  async save(job: Job, _companyId: string): Promise<Job> {
    this.canonical.set(job.id, job);
    this.listingsByJob.set(job.id, [{ ...job }]);
    return job;
  }

  async saveMany(entries: { job: Job; companyId: string }[]): Promise<void> {
    for (const entry of entries) {
      this.canonical.set(entry.job.id, entry.job);
      this.listingsByJob.set(entry.job.id, [{ ...entry.job }]);
    }
  }

  async attachListing(jobId: string, job: Job): Promise<void> {
    const listings = this.listingsByJob.get(jobId);
    if (!listings) {
      throw new Error(`Cannot attach listing: job ${jobId} not found`);
    }
    listings.push({ ...job, id: jobId });
  }

  async listByAnalysisState(state: AnalysisState, limit?: number): Promise<Job[]> {
    const matches = [...this.canonical.values()]
      .filter((job) => (job.analysisState ?? "none") === state)
      .toSorted((a, b) => b.discoveredAt.getTime() - a.discoveredAt.getTime());
    return limit !== undefined ? matches.slice(0, limit) : matches;
  }

  async updateNotes(jobId: string, notes: string[]): Promise<void> {
    const job = this.canonical.get(jobId);
    if (job) {
      this.canonical.set(jobId, { ...job, notes: [...notes] });
    }
  }

  async setAnalysisState(jobId: string, state: AnalysisState): Promise<void> {
    const job = this.canonical.get(jobId);
    if (job) {
      this.canonical.set(jobId, { ...job, analysisState: state });
    }
  }

  async setDismissed(jobId: string, dismissed: boolean): Promise<void> {
    const job = this.canonical.get(jobId);
    if (job) {
      this.canonical.set(jobId, { ...job, dismissedAt: dismissed ? new Date() : undefined });
    }
  }

  listingsFor(jobId: string): Job[] {
    return [...(this.listingsByJob.get(jobId) ?? [])];
  }
}
