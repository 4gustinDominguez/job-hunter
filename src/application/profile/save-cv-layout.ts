import { ValidationError } from "@/application/errors";
import type { CandidateProfileRepositoryPort } from "@/application/ports/candidate-profile-repository-port";
import type { SaveProfile } from "@/application/profile/save-profile";
import type { CvLayout } from "@/domain/candidate/cv-layout";
import { normalizeCvLayout } from "@/domain/candidate/cv-layout";
import type { CandidateProfile } from "@/domain/candidate/candidate-profile";

export class SaveCvLayout {
  constructor(
    private readonly profiles: CandidateProfileRepositoryPort,
    private readonly saveProfile: SaveProfile,
  ) {}

  async run(layout: CvLayout): Promise<CandidateProfile> {
    const existing = await this.profiles.findFirst();
    if (!existing) {
      throw new ValidationError("layout", "Save your profile first — the layout belongs to it.");
    }
    return this.saveProfile.run({ ...existing, cvLayout: normalizeCvLayout(layout) });
  }
}
