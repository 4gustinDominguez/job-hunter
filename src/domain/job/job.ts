import type { Company } from "@/domain/company/company";
import type { AnalysisState } from "@/domain/matching/job-analysis";
import type { EmploymentType, JobSourceType, RemoteType } from "@/domain/job/enums";
import type { Location } from "@/domain/shared/location";
import type { SalaryRange } from "@/domain/shared/salary";

export interface Job {
  id: string;
  source: JobSourceType;
  externalId?: string;
  url: string;
  title: string;
  company: Company;
  location?: Location;
  remoteType?: RemoteType;
  description: string;
  salary?: SalaryRange;
  employmentType?: EmploymentType;
  publishedAt?: Date;
  discoveredAt: Date;
  skills?: string[];
  notes?: string[];
  analysisState?: AnalysisState;
}
