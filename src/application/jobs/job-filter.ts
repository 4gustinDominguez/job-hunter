import type { EmploymentType, JobSourceType, RemoteType } from "@/domain/job/enums";

export interface JobFilter {
  query?: string;
  location?: string;
  remoteType?: RemoteType;
  employmentType?: EmploymentType;
  source?: JobSourceType;
  /** Default false: dismissed jobs are hidden from every browse view. */
  includeDismissed?: boolean;
}
