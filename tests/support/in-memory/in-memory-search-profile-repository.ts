import type { SearchProfileRepositoryPort } from "@/application/ports/search-profile-repository-port";
import type { JobSearchProfile } from "@/domain/search/search-profile";

export class InMemorySearchProfileRepository implements SearchProfileRepositoryPort {
  readonly items = new Map<string, JobSearchProfile>();

  async getById(id: string): Promise<JobSearchProfile | null> {
    return this.items.get(id) ?? null;
  }

  async list(): Promise<JobSearchProfile[]> {
    return [...this.items.values()];
  }

  async save(profile: JobSearchProfile): Promise<JobSearchProfile> {
    this.items.set(profile.id, profile);
    return profile;
  }

  async remove(id: string): Promise<void> {
    this.items.delete(id);
  }
}
