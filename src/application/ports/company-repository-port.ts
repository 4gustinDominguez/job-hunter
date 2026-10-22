import type { Company } from "@/domain/company/company";

export interface CompanyRepositoryPort {
  findOrCreate(company: Company): Promise<Company>;
}
