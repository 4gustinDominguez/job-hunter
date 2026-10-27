import type { CompanyRepositoryPort } from "@/application/ports/company-repository-port";
import type { Company } from "@/domain/company/company";
import { normalizeText } from "@/domain/shared/text";

export class InMemoryCompanyRepository implements CompanyRepositoryPort {
  readonly companies = new Map<string, Company>();
  private readonly idsByNormalizedName = new Map<string, string>();

  async findOrCreate(company: Company): Promise<Company> {
    const normalizedName = normalizeText(company.name);
    const existingId = this.idsByNormalizedName.get(normalizedName);
    if (existingId) {
      return this.companies.get(existingId) ?? company;
    }
    const created: Company = { ...company, id: crypto.randomUUID() };
    this.companies.set(created.id, created);
    this.idsByNormalizedName.set(normalizedName, created.id);
    return created;
  }

  async findOrCreateMany(list: Company[]): Promise<Map<string, Company>> {
    const byKey = new Map<string, Company>();
    for (const company of list) {
      const key = normalizeText(company.name);
      if (!byKey.has(key)) byKey.set(key, company);
    }
    const resolved = await Promise.all(
      [...byKey.values()].map((company) => this.findOrCreate(company)),
    );
    const result = new Map<string, Company>();
    for (const company of resolved) result.set(normalizeText(company.name), company);
    return result;
  }
}
