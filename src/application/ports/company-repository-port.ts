import type { Company } from "@/domain/company/company";

export interface CompanyRepositoryPort {
  findOrCreate(company: Company): Promise<Company>;
  /**
   * One lookup + one insert per batch. Returns each company keyed by
   * `normalizeText(company.name)` (deduplicated on the way in).
   */
  findOrCreateMany(companies: Company[]): Promise<Map<string, Company>>;
}
