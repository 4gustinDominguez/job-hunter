/* oxlint-disable no-await-in-loop -- sources are ingested sequentially by contract */
import type { CompanyRepositoryPort } from "@/application/ports/company-repository-port";
import type { JobRepositoryPort } from "@/application/ports/job-repository-port";
import type { JobSourcePort } from "@/application/ports/job-source-port";
import type { Company } from "@/domain/company/company";
import { canonicalizeUrl, isDuplicate, jobContentKey } from "@/domain/job/dedup";
import type { JobSourceType } from "@/domain/job/enums";
import type { Job } from "@/domain/job/job";
import type { JobSearchCriteria } from "@/domain/search/search-profile";
import { normalizeText } from "@/domain/shared/text";

export interface IngestJobsError {
  source: JobSourceType;
  message: string;
}

export interface IngestJobsResult {
  fetched: number;
  created: number;
  attached: number;
  skipped: number;
  errors: IngestJobsError[];
}

export class IngestJobs {
  constructor(
    private readonly sources: JobSourcePort[],
    private readonly jobs: JobRepositoryPort,
    private readonly companies: CompanyRepositoryPort,
  ) {}

  async run(criteria: JobSearchCriteria): Promise<IngestJobsResult> {
    const result: IngestJobsResult = {
      fetched: 0,
      created: 0,
      attached: 0,
      skipped: 0,
      errors: [],
    };
    for (const source of this.sources) {
      let found: Job[];
      try {
        found = await source.search(criteria);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push({ source: source.type, message });
        console.warn(`[ingest] source ${source.type} failed:`, message);
        continue;
      }
      result.fetched += found.length;
      await this.ingestBatch(found, result);
    }
    return result;
  }

  /**
   * Batched ingest: four lookups per source (canonical urls, external ids,
   * content keys, companies) plus chunked bulk inserts — instead of the ~6
   * round trips per job the per-job flow made. At a400-job run against Neon
   * that is the difference between seconds and several minutes of wall clock
   * (and the difference between fitting or not fitting the 300s cron limit).
   */
  private async ingestBatch(found: Job[], result: IngestJobsResult): Promise<void> {
    if (found.length === 0) return;

    // Fresh ids up front (sources may not be trusted with ids) so intra-batch
    // dedupe can attach a listing to a job created in this same batch.
    const incoming = found.map((job) => ({ ...job, id: crypto.randomUUID() }));

    // 0) same canonical url inside the batch: first occurrence wins.
    const byCanonicalUrl = new Map<string, Job>();
    for (const job of incoming) {
      const key = canonicalizeUrl(job.url);
      if (byCanonicalUrl.has(key)) {
        result.skipped += 1;
      } else {
        byCanonicalUrl.set(key, job);
      }
    }

    // 1) already known by url?
    const urlMatches = await this.jobs.findJobIdsByCanonicalUrls([...byCanonicalUrl.keys()]);
    let pending: Job[] = [];
    for (const [canonical, job] of byCanonicalUrl) {
      if (urlMatches.has(canonical)) result.skipped += 1;
      else pending.push(job);
    }

    // 2) already known by (source, external id)?
    const bySource = new Map<JobSourceType, Job[]>();
    for (const job of pending) {
      if (job.externalId === undefined) continue;
      const group = bySource.get(job.source);
      if (group) group.push(job);
      else bySource.set(job.source, [job]);
    }
    for (const [sourceType, group] of bySource) {
      const externalIds = group
        .map((job) => job.externalId)
        .filter((id): id is string => id !== undefined);
      const externalMatches = await this.jobs.findJobIdsByExternalIds(sourceType, externalIds);
      pending = pending.filter((job) => {
        const matches =
          job.source === sourceType &&
          job.externalId !== undefined &&
          externalMatches.has(job.externalId);
        if (matches) result.skipped += 1;
        return !matches;
      });
    }

    if (pending.length === 0) return;

    // 3) same content as an existing job → attach as an extra listing instead
    //    of creating a duplicate row (candidates: stored rows + this batch).
    const contentKeys = [...new Set(pending.map((job) => jobContentKey(job)))];
    const existingByKey = await this.jobs.findByContentKeys(contentKeys);
    const storedGroups = new Map<string, Job[]>();
    for (const job of existingByKey) pushGroup(storedGroups, jobContentKey(job), job);

    const toInsert: Job[] = [];
    const freshByKey = new Map<string, Job[]>();
    // Attaches that target a job created in this same batch are deferred until
    // after saveMany — the target row does not exist yet at decision time.
    const attachAfterInsert: { targetId: string; listing: Job }[] = [];
    for (const job of pending) {
      const key = jobContentKey(job);
      const storedDuplicate = storedGroups.get(key)?.find((c) => isDuplicate(c, job));
      if (storedDuplicate) {
        await this.jobs.attachListing(storedDuplicate.id, job);
        result.attached += 1;
        continue;
      }
      const freshDuplicate = freshByKey.get(key)?.find((c) => isDuplicate(c, job));
      if (freshDuplicate) {
        attachAfterInsert.push({ targetId: freshDuplicate.id, listing: job });
        result.attached += 1;
        continue;
      }
      toInsert.push(job);
      pushGroup(freshByKey, key, job);
    }

    if (toInsert.length === 0 && attachAfterInsert.length === 0) return;

    if (toInsert.length > 0) {
      // 4) one company lookup + chunked bulk insert for the whole batch.
      const uniqueCompanies = new Map<string, Company>();
      for (const job of toInsert) {
        const key = normalizeText(job.company.name);
        if (!uniqueCompanies.has(key)) uniqueCompanies.set(key, job.company);
      }
      const resolved = await this.companies.findOrCreateMany([...uniqueCompanies.values()]);
      const entries = toInsert.map((job) => {
        const company = resolved.get(normalizeText(job.company.name));
        if (!company) {
          throw new Error(`IngestJobs: company "${job.company.name}" was not resolved`);
        }
        return { job, companyId: company.id };
      });
      await this.jobs.saveMany(entries);
      result.created += entries.length;
    }

    for (const attach of attachAfterInsert) {
      await this.jobs.attachListing(attach.targetId, attach.listing);
    }
  }
}

function pushGroup(groups: Map<string, Job[]>, key: string, job: Job): void {
  const group = groups.get(key);
  if (group) group.push(job);
  else groups.set(key, [job]);
}
