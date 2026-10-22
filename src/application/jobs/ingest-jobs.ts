/* oxlint-disable no-await-in-loop -- sources are ingested sequentially by contract */
import type { CompanyRepositoryPort } from "@/application/ports/company-repository-port";
import type { JobRepositoryPort } from "@/application/ports/job-repository-port";
import type { JobSourcePort } from "@/application/ports/job-source-port";
import { isDuplicate, jobContentKey } from "@/domain/job/dedup";
import type { JobSourceType } from "@/domain/job/enums";
import type { Job } from "@/domain/job/job";
import type { JobSearchCriteria } from "@/domain/search/search-profile";

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
      for (const job of found) {
        result[await this.ingestOne(job)] += 1;
      }
    }
    return result;
  }

  private async ingestOne(incoming: Job): Promise<"created" | "attached" | "skipped"> {
    if (await this.jobs.findByUrl(incoming.url)) {
      return "skipped";
    }
    if (
      incoming.externalId !== undefined &&
      (await this.jobs.findBySourceAndExternalId(incoming.source, incoming.externalId))
    ) {
      return "skipped";
    }
    const candidates = await this.jobs.findByContentKey(jobContentKey(incoming));
    const duplicate = candidates.find((candidate) => isDuplicate(candidate, incoming));
    if (duplicate) {
      await this.jobs.attachListing(duplicate.id, incoming);
      return "attached";
    }
    const company = await this.companies.findOrCreate(incoming.company);
    await this.jobs.save({ ...incoming, id: crypto.randomUUID() }, company.id);
    return "created";
  }
}
