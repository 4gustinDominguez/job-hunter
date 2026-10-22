import type { Job } from "@/domain/job/job";
import type { JobSourceType } from "@/domain/job/enums";
import type { JobSearchCriteria } from "@/domain/search/search-profile";

export interface JobSourcePort {
  readonly type: JobSourceType;
  search(criteria: JobSearchCriteria): Promise<Job[]>;
}
