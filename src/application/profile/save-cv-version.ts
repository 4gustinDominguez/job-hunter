import { ValidationError } from "@/application/errors";
import type { CandidateProfileRepositoryPort } from "@/application/ports/candidate-profile-repository-port";
import type { CvVersionRepositoryPort } from "@/application/ports/cv-version-repository-port";
import type { SaveProfileInput } from "@/application/profile/save-profile";
import { normalizeCvLayout } from "@/domain/candidate/cv-layout";
import { normalizeCvTemplate } from "@/domain/candidate/cv-template";
import type { CvSnapshot, CvVersion } from "@/domain/candidate/cv-version";

const MAX_LABEL_LENGTH = 80;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** "Version 2026-11-12 09:15" — the label you get when you don't type one. */
function defaultLabel(now: Date): string {
  return `Version ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/**
 * Snapshots the profile form AS IT IS — unsaved edits included — without
 * writing to the profile: only Save profile or loading a version change the
 * saved content. Layout/template come from the saved profile (they are edited
 * elsewhere and always persisted); job preferences are deliberately excluded.
 */
export class SaveCvVersion {
  constructor(
    private readonly profiles: CandidateProfileRepositoryPort,
    private readonly versions: CvVersionRepositoryPort,
  ) {}

  async run(rawLabel: string, input: SaveProfileInput): Promise<CvVersion> {
    const current = await this.profiles.findFirst();
    if (!current) {
      throw new ValidationError("label", "Save your profile first — versions belong to it.");
    }

    const label = rawLabel.trim().slice(0, MAX_LABEL_LENGTH) || defaultLabel(new Date());
    const snapshot: CvSnapshot = {
      name: input.name.trim() || current.name,
      email: input.email.trim() || current.email,
      phone: input.phone?.trim() || undefined,
      location: input.location,
      summary: input.summary?.trim() || undefined,
      skills: input.skills,
      experience: input.experience,
      projects: input.projects,
      education: input.education,
      cvLayout: normalizeCvLayout(current.cvLayout),
      cvTemplate: normalizeCvTemplate(current.cvTemplate),
    };

    return this.versions.save({
      id: crypto.randomUUID(),
      profileId: current.id,
      label,
      snapshot,
      createdAt: new Date(),
    });
  }
}
