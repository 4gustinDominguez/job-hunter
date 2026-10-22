import type { JobAnalysis } from "@/domain/matching/job-analysis";
import type { Job } from "@/domain/job/job";
import type { CandidateProfile } from "@/domain/candidate/candidate-profile";

export interface JobMatcherPort {
  readonly provider: string;
  readonly model: string;
  analyze(job: Job, profile: CandidateProfile): Promise<JobAnalysis>;
}
