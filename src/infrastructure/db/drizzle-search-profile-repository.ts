import { asc, eq } from "drizzle-orm";
import type { SearchProfileRepositoryPort } from "@/application/ports/search-profile-repository-port";
import type { JobSearchProfile } from "@/domain/search/search-profile";
import type { db } from "./client";
import { searchProfiles } from "./schema";

type Db = typeof db;
type SearchProfileRow = typeof searchProfiles.$inferSelect;

function toDomainSearchProfile(row: SearchProfileRow): JobSearchProfile {
  return {
    id: row.id,
    name: row.name,
    keywords: row.keywords,
    locations: row.locations,
    remotePreference: row.remotePreference ?? undefined,
    employmentTypes: row.employmentTypes ?? undefined,
    seniority: row.seniority ?? undefined,
    salary:
      row.salaryMin === null && row.salaryCurrency === null
        ? undefined
        : { minimum: row.salaryMin ?? undefined, currency: row.salaryCurrency ?? undefined },
    excludedCompanies: row.excludedCompanies ?? undefined,
    excludedKeywords: row.excludedKeywords ?? undefined,
  };
}

export class DrizzleSearchProfileRepository implements SearchProfileRepositoryPort {
  constructor(private readonly database: Db) {}

  async getById(id: string): Promise<JobSearchProfile | null> {
    const [row] = await this.database
      .select()
      .from(searchProfiles)
      .where(eq(searchProfiles.id, id))
      .limit(1);
    return row ? toDomainSearchProfile(row) : null;
  }

  async list(): Promise<JobSearchProfile[]> {
    const rows = await this.database
      .select()
      .from(searchProfiles)
      .orderBy(asc(searchProfiles.createdAt));
    return rows.map(toDomainSearchProfile);
  }

  async save(profile: JobSearchProfile): Promise<JobSearchProfile> {
    const values = {
      name: profile.name,
      keywords: profile.keywords,
      locations: profile.locations,
      remotePreference: profile.remotePreference ?? null,
      employmentTypes: profile.employmentTypes ?? null,
      seniority: profile.seniority ?? null,
      salaryMin: profile.salary?.minimum ?? null,
      salaryCurrency: profile.salary?.currency ?? null,
      excludedCompanies: profile.excludedCompanies ?? null,
      excludedKeywords: profile.excludedKeywords ?? null,
    };
    const [row] = await this.database
      .insert(searchProfiles)
      .values({ id: profile.id, ...values })
      .onConflictDoUpdate({
        target: searchProfiles.id,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();
    return toDomainSearchProfile(row);
  }

  async remove(id: string): Promise<void> {
    await this.database.delete(searchProfiles).where(eq(searchProfiles.id, id));
  }
}
