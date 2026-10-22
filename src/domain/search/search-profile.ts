import type { EmploymentType, Seniority } from "@/domain/job/enums";
import type { RemotePreference } from "@/domain/shared/remote-preference";

export interface JobSearchProfile {
  id: string;
  name: string;
  keywords: string[];
  locations: string[];
  remotePreference?: RemotePreference;
  employmentTypes?: EmploymentType[];
  seniority?: Seniority[];
  salary?: {
    minimum?: number;
    currency?: string;
  };
  excludedCompanies?: string[];
  excludedKeywords?: string[];
}

export interface JobSearchCriteria {
  keywords: string[];
  locations?: string[];
  remotePreference?: RemotePreference;
  employmentTypes?: EmploymentType[];
  seniority?: Seniority[];
  salaryMinimum?: number;
  salaryCurrency?: string;
  excludedCompanies?: string[];
  excludedKeywords?: string[];
}
