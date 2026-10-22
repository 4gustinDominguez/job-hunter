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
    const normalizedName = normalizeText(company.name);
    const values = {
      name: company.name,
      normalizedName,
      url: company.url ?? null,
      description: company.description ?? null,
      industry: company.industry ?? null,
      size: company.size ?? null,
      location: company.location ?? null,
    };
    const [row] = await this.database
      .insert(companies)
      .values(values)
      .onConflictDoUpdate({
        target: companies.normalizedName,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();
    return toDomainCompany(row);
  }
}
