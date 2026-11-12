import { NotFoundError, ValidationError } from "@/application/errors";
import type { CandidateProfileRepositoryPort } from "@/application/ports/candidate-profile-repository-port";
import type { CvVersionRepositoryPort } from "@/application/ports/cv-version-repository-port";
import { cvSnapshotSchema } from "@/application/profile/profile-schemas";
import type { SaveProfile } from "@/application/profile/save-profile";
import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import { normalizeCvLayout } from "@/domain/candidate/cv-layout";

export class LoadCvVersion {
  constructor(
    private readonly profiles: CandidateProfileRepositoryPort,
    private readonly versions: CvVersionRepositoryPort,
    private readonly saveProfile: SaveProfile,
  ) {}

  async run(versionId: string): Promise<CandidateProfile> {
    const version = await this.versions.getById(versionId);
    if (!version) {
      throw new NotFoundError("CV version", versionId);
    }
    const current = await this.profiles.findFirst();
    if (!current) {
      throw new ValidationError("version", "No profile to load this version into.");
    }

    const parsed = cvSnapshotSchema.safeParse(version.snapshot);
    if (!parsed.success) {
      throw new ValidationError("version", "This version can't be restored — its data is damaged.");
    }
    const snapshot = parsed.data;

    return this.saveProfile.run({
      ...current,
      name: snapshot.name,
      email: snapshot.email,
      phone: snapshot.phone,
      location: snapshot.location,
      summary: snapshot.summary,
      skills: snapshot.skills,
      experience: snapshot.experience,
      projects: snapshot.projects,
      education: snapshot.education,
      cvLayout: normalizeCvLayout(snapshot.cvLayout),
    });
  }
}
