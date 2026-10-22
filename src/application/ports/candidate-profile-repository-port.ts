import type { CandidateProfile } from "@/domain/candidate/candidate-profile";

export interface CandidateProfileRepositoryPort {
  getById(id: string): Promise<CandidateProfile | null>;
  findFirst(): Promise<CandidateProfile | null>;
  save(profile: CandidateProfile): Promise<CandidateProfile>;
}
