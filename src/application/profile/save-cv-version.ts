import { ValidationError } from "@/application/errors";
import type { CandidateProfileRepositoryPort } from "@/application/ports/candidate-profile-repository-port";
import type { CvVersionRepositoryPort } from "@/application/ports/cv-version-repository-port";
import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import { normalizeCvLayout } from "@/domain/candidate/cv-layout";
import { normalizeCvTemplate } from "@/domain/candidate/cv-template";
import type { CvSnapshot, CvVersion } from "@/domain/candidate/cv-version";

const MAX_LABEL_LENGTH = 80;

/** "Version 2026-11-12 09:15" — the label you get when you don't type one. */
function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function defaultLabel(now: Date): string {
  return `Version ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function snapshotOf(profile: CandidateProfile): CvSnapshot {
  return {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    summary: profile.summary,
    skills: profile.skills,
    experience: profile.experience,
    projects: profile.projects,
    education: profile.education,
    cvLayout: normalizeCvLayout(profile.cvLayout),
    cvTemplate: normalizeCvTemplate(profile.cvTemplate),
  };
}

export class SaveCvVersion {
  constructor(
    private readonly profiles: CandidateProfileRepositoryPort,
    private readonly versions: CvVersionRepositoryPort,
  ) {}

  async run(rawLabel: string): Promise<CvVersion> {
    const profile = await this.profiles.findFirst();
    if (!profile) {
      throw new ValidationError("label", "Save your profile first — versions snapshot it.");
    }
    const label = rawLabel.trim().slice(0, MAX_LABEL_LENGTH) || defaultLabel(new Date());
    return this.versions.save({
      id: crypto.randomUUID(),
      profileId: profile.id,
      label,
      snapshot: snapshotOf(profile),
      createdAt: new Date(),
    });
  }
}
