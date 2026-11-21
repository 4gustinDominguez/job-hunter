import { ValidationError } from "@/application/errors";
import type { CandidateProfileRepositoryPort } from "@/application/ports/candidate-profile-repository-port";
import type { SaveProfile } from "@/application/profile/save-profile";
import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import { normalizeCvTemplate } from "@/domain/candidate/cv-template";
import type { CvTemplateConfig } from "@/domain/candidate/cv-template";

export class SaveCvTemplate {
  constructor(
    private readonly profiles: CandidateProfileRepositoryPort,
    private readonly saveProfile: SaveProfile,
  ) {}

  async run(config: CvTemplateConfig): Promise<CandidateProfile> {
    const existing = await this.profiles.findFirst();
    if (!existing) {
      throw new ValidationError(
        "template",
        "Save your profile first — the template belongs to it.",
      );
    }
    return this.saveProfile.run({ ...existing, cvTemplate: normalizeCvTemplate(config) });
  }
}
