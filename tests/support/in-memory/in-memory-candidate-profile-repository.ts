import type { CandidateProfileRepositoryPort } from "@/application/ports/candidate-profile-repository-port";
import type { CandidateProfile } from "@/domain/candidate/candidate-profile";

export class InMemoryCandidateProfileRepository implements CandidateProfileRepositoryPort {
  readonly items = new Map<string, CandidateProfile>();

  async getById(id: string): Promise<CandidateProfile | null> {
    return this.items.get(id) ?? null;
  }

  async findFirst(): Promise<CandidateProfile | null> {
    const values = [...this.items.values()];
    return values.at(-1) ?? null;
  }

  async save(profile: CandidateProfile): Promise<CandidateProfile> {
    this.items.set(profile.id, profile);
    return profile;
  }
}
