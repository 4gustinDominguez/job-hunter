import { inArray } from "drizzle-orm";
import type { CompanyRepositoryPort } from "@/application/ports/company-repository-port";
import type { Company } from "@/domain/company/company";
import { normalizeText } from "@/domain/shared/text";
import type { db } from "./client";
import { companies } from "./schema";

type Db = typeof db;
type CompanyRow = typeof companies.$inferSelect;

function toDomainCompany(row: CompanyRow): Company {
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

export class DrizzleCompanyRepository implements CompanyRepositoryPort {
  constructor(private readonly database: Db) {}

  async findOrCreate(company: Company): Promise<Company> {
    const [row] = await this.database
      .insert(companies)
      .values(this.rowValues(company))
      .onConflictDoUpdate({
        target: companies.normalizedName,
        set: { ...this.rowValues(company), updatedAt: new Date() },
      })
      .returning();
    return toDomainCompany(row);
  }

  /**
   * One SELECT + one INSERT per batch: resolves existing companies and creates
   * the missing ones (including a re-select for any conflicting race).
   */
  async findOrCreateMany(list: Company[]): Promise<Map<string, Company>> {
    const byKey = new Map<string, Company>();
    for (const company of list) {
      const key = normalizeText(company.name);
      if (!byKey.has(key)) byKey.set(key, company);
    }
    const result = new Map<string, Company>();
    const keys = [...byKey.keys()];
    if (keys.length === 0) return result;

    const existing = await this.database
      .select()
      .from(companies)
      .where(inArray(companies.normalizedName, keys));
    for (const row of existing) result.set(row.normalizedName, toDomainCompany(row));

    const missingKeys = keys.filter((key) => !result.has(key));
    if (missingKeys.length > 0) {
      const rows = missingKeys.map((key) => this.rowValues(byKey.get(key) as Company));
      const inserted = await this.database
        .insert(companies)
        .values(rows)
        .onConflictDoNothing()
        .returning();
      for (const row of inserted) result.set(row.normalizedName, toDomainCompany(row));
      const unresolved = keys.filter((key) => !result.has(key));
      if (unresolved.length > 0) {
        const raced = await this.database
          .select()
          .from(companies)
          .where(inArray(companies.normalizedName, unresolved));
        for (const row of raced) result.set(row.normalizedName, toDomainCompany(row));
      }
    }
    return result;
  }

  private rowValues(company: Company) {
    return {
      name: company.name,
      normalizedName: normalizeText(company.name),
      url: company.url ?? null,
      description: company.description ?? null,
      industry: company.industry ?? null,
      size: company.size ?? null,
      location: company.location ?? null,
    };
  }
}
