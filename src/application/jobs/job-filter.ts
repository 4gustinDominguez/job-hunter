import type { EmploymentType, JobSourceType, RemoteType } from "@/domain/job/enums";
import type { AnalysisState, MatchClassification } from "@/domain/matching/job-analysis";

export interface JobFilter {
  query?: string;
  location?: string;
  remoteType?: RemoteType;
  employmentType?: EmploymentType;
  source?: JobSourceType;
  /** Default false: dismissed jobs are hidden from every browse view. */
  includeDismissed?: boolean;
  /** Fit filter — job_analyses.classification IN (…). */
  classifications?: MatchClassification[];
  analysisState?: AnalysisState;
  /** Funnel: exclude jobs that already have an application (they live in /applications). */
  excludeApplied?: boolean;
  discoveredSince?: Date;
  /** Order by fit rank (STRONG → NONE) then recency. */
  sortByFit?: boolean;
}
