import type { JobSearchProfile } from "@/domain/search/search-profile";

export interface SearchProfileRepositoryPort {
  getById(id: string): Promise<JobSearchProfile | null>;
  list(): Promise<JobSearchProfile[]>;
  save(profile: JobSearchProfile): Promise<JobSearchProfile>;
  remove(id: string): Promise<void>;
}
