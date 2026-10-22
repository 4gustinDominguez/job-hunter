import { ValidationError } from "@/application/errors";
import type { CandidateProfileRepositoryPort } from "@/application/ports/candidate-profile-repository-port";
import type { CandidateProfile } from "@/domain/candidate/candidate-profile";

export type SaveProfileInput = Omit<CandidateProfile, "id"> & { id?: string };

export class SaveProfile {
  constructor(private readonly profiles: CandidateProfileRepositoryPort) {}

  async run(input: SaveProfileInput): Promise<CandidateProfile> {
    const name = input.name.trim();
    const email = input.email.trim();
    if (!name) {
      throw new ValidationError("name", "Name is required");
    }
    if (!email) {
      throw new ValidationError("email", "Email is required");
    }
    const existing = input.id ? undefined : await this.profiles.findFirst();
    const profile: CandidateProfile = {
      ...input,
      id: input.id || existing?.id || crypto.randomUUID(),
      name,
      email,
    };
    return this.profiles.save(profile);
  }
}
