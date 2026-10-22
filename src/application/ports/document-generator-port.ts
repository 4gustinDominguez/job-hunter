import type { DocumentKind } from "@/domain/documents/generated-document";
import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import type { JobAnalysis } from "@/domain/matching/job-analysis";
import type { Job } from "@/domain/job/job";

export interface DocumentGeneratorPort {
  readonly provider: string;
  readonly model: string;
  generate(
    kind: DocumentKind,
    job: Job,
    profile: CandidateProfile,
    analysis?: JobAnalysis,
  ): Promise<string>;
}
