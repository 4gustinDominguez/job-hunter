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
}
