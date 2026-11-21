import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import type { Location } from "@/domain/shared/location";
import { SKILL_CATEGORY_LABELS, SKILL_CATEGORY_ORDER } from "@/domain/candidate/skill";

export const JSON_RESUME_SCHEMA =
  "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json";

export interface JsonResume {
  $schema: string;
  basics: {
    name: string;
    label?: string;
    email: string;
    phone?: string;
    location?: { city?: string; region?: string; country?: string; remote?: boolean };
    summary?: string;
  };
  work: Array<{
    name: string;
    position: string;
    startDate: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
    keywords?: string[];
  }>;
  education: Array<{
    institution: string;
    studyType: string;
    area: string;
    startDate: string;
    endDate?: string;
    courses?: string[];
  }>;
  skills: Array<{ name: string; keywords: string[] }>;
  projects: Array<{
    name: string;
    description?: string;
    highlights?: string[];
    keywords?: string[];
    url?: string;
  }>;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function filled(values: string[]): string[] | undefined {
  const kept = values.map((value) => value.trim()).filter(Boolean);
  return kept.length > 0 ? kept : undefined;
}

function toJsonLocation(location: Location | undefined) {
  if (!location) return undefined;
  const value = {
    city: location.city?.trim() || undefined,
    region: location.region?.trim() || undefined,
    country: location.country?.trim() || undefined,
    remote: location.isRemote,
  };
  return value.city || value.region || value.country || value.remote ? value : undefined;
}

/** The public CV as JSON Resume data — one file any theme/tool/ATS check can consume. */
export function toJsonResume(profile: CandidateProfile): JsonResume {
  const experience = [...profile.experience].toSorted(
    (a, b) => b.startDate.getTime() - a.startDate.getTime(),
  );
  const latestPosition = experience[0]?.position?.trim();

  const work = experience.map((item) => ({
    name: item.company,
    position: item.position,
    startDate: isoDate(item.startDate),
    endDate: item.endDate ? isoDate(item.endDate) : undefined,
    summary: item.description.trim() || undefined,
    highlights: filled(item.achievements),
    keywords: filled(item.skills),
  }));

  const education = [...profile.education]
    .toSorted((a, b) => b.startDate.getTime() - a.startDate.getTime())
    .map((item) => ({
      institution: item.institution,
      studyType: item.degree,
      area: item.field,
      startDate: isoDate(item.startDate),
      endDate: item.endDate ? isoDate(item.endDate) : undefined,
      courses: filled(item.achievements ?? []),
    }));

  const skills = SKILL_CATEGORY_ORDER.flatMap((category) => {
    const keywords = filled(
      profile.skills.filter((skill) => skill.category === category).map((skill) => skill.name),
    );
    return keywords ? [{ name: SKILL_CATEGORY_LABELS[category], keywords }] : [];
  });

  const projects = profile.projects.map((project) => ({
    name: project.name,
    description: project.description.trim() || undefined,
    highlights: filled(project.highlights),
    keywords: filled(project.technologies),
    url: project.url?.trim() || undefined,
  }));

  return {
    $schema: JSON_RESUME_SCHEMA,
    basics: {
      name: profile.name,
      label: latestPosition,
      email: profile.email,
      phone: profile.phone?.trim() || undefined,
      location: toJsonLocation(profile.location),
      summary: profile.summary?.trim() || undefined,
    },
    work,
    education,
    skills,
    projects,
  };
}
