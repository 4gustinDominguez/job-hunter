import { ValidationError } from "@/application/errors";
import type { SearchProfileRepositoryPort } from "@/application/ports/search-profile-repository-port";
import type { JobSearchProfile } from "@/domain/search/search-profile";

export type SaveSearchProfileInput = Omit<JobSearchProfile, "id"> & { id?: string };

export class SaveSearchProfile {
  constructor(private readonly profiles: SearchProfileRepositoryPort) {}

  async run(input: SaveSearchProfileInput): Promise<JobSearchProfile> {
    const name = input.name.trim();
    if (!name) {
      throw new ValidationError("name", "Name is required");
    }
    const profile: JobSearchProfile = {
      ...input,
      id: input.id ?? crypto.randomUUID(),
      name,
    };
    return this.profiles.save(profile);
  }
}
