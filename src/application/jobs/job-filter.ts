import type { EmploymentType, JobSourceType, RemoteType } from "@/domain/job/enums";

export interface JobFilter {
  query?: string;
  location?: string;
  remoteType?: RemoteType;
  employmentType?: EmploymentType;
  source?: JobSourceType;
}
