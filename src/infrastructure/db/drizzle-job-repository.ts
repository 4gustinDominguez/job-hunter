import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { JobFilter } from "@/application/jobs/job-filter";
import type { JobRepositoryPort } from "@/application/ports/job-repository-port";
import { canonicalizeUrl, jobContentKey } from "@/domain/job/dedup";
import type { JobSourceType } from "@/domain/job/enums";
import type { AnalysisState } from "@/domain/matching/job-analysis";
import type { Job } from "@/domain/job/job";
import type { db } from "./client";
import { companies, jobListings, jobs } from "./schema";

type Db = typeof db;
type JobRow = typeof jobs.$inferSelect;
type CompanyRow = typeof companies.$inferSelect;
type ListingRow = typeof jobListings.$inferSelect;
type JobWithCompany = { job: JobRow; company: CompanyRow };

function toDomainCompany(row: CompanyRow) {
  return {
    id: row.id,
    name: row.name,
    url: row.url ?? undefined,
    description: row.description ?? undefined,
    industry: row.industry ?? undefined,
    size: row.size ?? undefined,
    location: row.location ?? undefined,
  };
}

function toDomainJob(row: JobWithCompany, listing: ListingRow): Job {
  return {
    id: row.job.id,
    source: listing.source,
    externalId: listing.externalId ?? undefined,
    url: listing.url,
    title: row.job.title,
    company: toDomainCompany(row.company),
    location: row.job.location ?? undefined,
    remoteType: row.job.remoteType ?? undefined,
    description: row.job.description,
    salary: row.job.salary ?? undefined,
    employmentType: row.job.employmentType ?? undefined,
    publishedAt: listing.publishedAt ?? undefined,
    discoveredAt: listing.discoveredAt,
    skills: row.job.skills ?? undefined,
    notes: row.job.notes ?? undefined,
    analysisState: row.job.analysisState ?? "none",
  };
}

export class DrizzleJobRepository implements JobRepositoryPort {
  constructor(private readonly database: Db) {}

  async getById(id: string): Promise<Job | null> {
    const [row] = await this.database
      .select({ job: jobs, company: companies })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(eq(jobs.id, id))
      .limit(1);
    if (!row) return null;
    const listing = await this.firstListing(id);
    if (!listing) return null;
    return toDomainJob(row, listing);
  }

  async list(filter: JobFilter = {}): Promise<Job[]> {
    const conditions: (SQL | undefined)[] = [];
    if (filter.query !== undefined && filter.query !== "") {
      const pattern = `%${filter.query}%`;
      conditions.push(
        or(
          ilike(jobs.title, pattern),
          ilike(jobs.description, pattern),
          ilike(companies.name, pattern),
        ),
      );
    }
    if (filter.location !== undefined && filter.location !== "") {
      const pattern = `%${filter.location.toLowerCase()}%`;
      conditions.push(
        sql`lower(concat_ws(' ', ${jobs.location} ->> 'city', ${jobs.location} ->> 'region', ${jobs.location} ->> 'country')) LIKE ${pattern}`,
      );
    }
    if (filter.remoteType !== undefined) {
      conditions.push(eq(jobs.remoteType, filter.remoteType));
    }
    if (filter.employmentType !== undefined) {
      conditions.push(eq(jobs.employmentType, filter.employmentType));
    }
    if (filter.source !== undefined) {
      const source = filter.source;
      conditions.push(
        sql`exists (select 1 from ${jobListings} where ${jobListings.jobId} = ${jobs.id} and ${jobListings.source} = ${source})`,
      );
    }
    const rows = await this.database
      .select({ job: jobs, company: companies })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(and(...conditions))
      // id tiebreaker keeps pagination stable when createdAt collides
      .orderBy(desc(jobs.createdAt), desc(jobs.id));
    return this.withFirstListings(rows);
  }

  async findByUrl(url: string): Promise<Job | null> {
    const [listing] = await this.database
      .select()
      .from(jobListings)
      .where(eq(jobListings.canonicalUrl, canonicalizeUrl(url)))
      .limit(1);
    if (!listing) return null;
    return this.getById(listing.jobId);
  }

  async findBySourceAndExternalId(source: JobSourceType, externalId: string): Promise<Job | null> {
    const [listing] = await this.database
      .select()
      .from(jobListings)
      .where(and(eq(jobListings.source, source), eq(jobListings.externalId, externalId)))
      .limit(1);
    if (!listing) return null;
    return this.getById(listing.jobId);
  }

  async findByContentKey(contentKey: string): Promise<Job[]> {
    const rows = await this.database
      .select({ job: jobs, company: companies })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(eq(jobs.contentKey, contentKey));
    return this.withFirstListings(rows);
  }

  async listListings(jobId: string): Promise<Job[]> {
    const [row] = await this.database
      .select({ job: jobs, company: companies })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(eq(jobs.id, jobId))
      .limit(1);
    if (!row) return [];
    const listings = await this.database
      .select()
      .from(jobListings)
      .where(eq(jobListings.jobId, jobId))
      .orderBy(asc(jobListings.createdAt), asc(jobListings.id));
    return listings.map((listing) => toDomainJob(row, listing));
  }

  async save(job: Job, companyId: string): Promise<Job> {
    await this.database.insert(jobs).values({
      id: job.id,
      title: job.title,
      description: job.description,
      companyId,
      location: job.location ?? null,
      remoteType: job.remoteType ?? null,
      salary: job.salary ?? null,
      employmentType: job.employmentType ?? null,
      skills: job.skills ?? null,
      contentKey: jobContentKey(job),
    });
    await this.database.insert(jobListings).values(this.listingValues(job.id, job));
    return job;
  }

  async attachListing(jobId: string, job: Job): Promise<void> {
    await this.database.insert(jobListings).values(this.listingValues(jobId, job));
  }

  async listByAnalysisState(state: AnalysisState, limit?: number): Promise<Job[]> {
    const query = this.database
      .select({ job: jobs, company: companies })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(eq(jobs.analysisState, state))
      .orderBy(desc(jobs.createdAt))
      .limit(limit ?? 10_000);
    const rows = await query;
    return this.withFirstListings(rows);
  }

  async updateNotes(jobId: string, notes: string[]): Promise<void> {
    await this.database.update(jobs).set({ notes }).where(eq(jobs.id, jobId));
  }

  async setAnalysisState(jobId: string, state: AnalysisState): Promise<void> {
    await this.database.update(jobs).set({ analysisState: state }).where(eq(jobs.id, jobId));
  }

  private listingValues(jobId: string, job: Job) {
    return {
      jobId,
      source: job.source,
      externalId: job.externalId ?? null,
      url: job.url,
      canonicalUrl: canonicalizeUrl(job.url),
      publishedAt: job.publishedAt ?? null,
      discoveredAt: job.discoveredAt,
    };
  }

  private async firstListing(jobId: string): Promise<ListingRow | undefined> {
    const [listing] = await this.database
      .select()
      .from(jobListings)
      .where(eq(jobListings.jobId, jobId))
      .orderBy(asc(jobListings.createdAt), asc(jobListings.id))
      .limit(1);
    return listing;
  }

  private async withFirstListings(rows: JobWithCompany[]): Promise<Job[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.job.id);
    const listings = await this.database
      .select()
      .from(jobListings)
      .where(inArray(jobListings.jobId, ids))
      .orderBy(asc(jobListings.createdAt), asc(jobListings.id));
    const firstByJob = new Map<string, ListingRow>();
    for (const listing of listings) {
      if (!firstByJob.has(listing.jobId)) {
        firstByJob.set(listing.jobId, listing);
      }
    }
    const result: Job[] = [];
    for (const row of rows) {
      const listing = firstByJob.get(row.job.id);
      if (listing) {
        result.push(toDomainJob(row, listing));
      }
    }
    return result;
  }
}
