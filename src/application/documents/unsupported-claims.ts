import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import type { Job } from "@/domain/job/job";
import { normalizeText } from "@/domain/shared/text";

const TECH_TOKEN_REGEX =
  /\b(?:[A-Z]{2,}[0-9]*|[A-Za-z][A-Za-z0-9]*(?:[.#+][A-Za-z0-9]+)+|[a-z]+[A-Z][A-Za-z0-9]*|[A-Z][A-Za-z0-9]{4,})\b/g;

const SENTENCE_START_REGEX = /(?:^|[\n.!?]["'“(]?\s+)$/;

const MAX_WARNINGS = 8;

/**
 * Warning-only heuristic: flags technical-looking tokens in generated content
 * (acronyms, dotted/symbolic names, camelCase, Capitalized words ≥5 chars)
 * that appear in neither the profile nor the job. Sentence-initial prose
 * capitals are skipped (English sentences start capitalized). Deliberately
 * conservative — never blocks, only warns (hard rules live in the prompt +
 * mandatory human review).
 */
export function findUnsupportedClaims(
  content: string,
  profile: CandidateProfile,
  job: Job,
): string[] {
  const profileText = [
    profile.name,
    profile.email,
    profile.phone ?? "",
    profile.summary ?? "",
    profile.location
      ? [profile.location.city, profile.location.region, profile.location.country]
          .filter(Boolean)
          .join(" ")
      : "",
    ...profile.skills.map((skill) => `${skill.name} ${skill.level}`),
    ...profile.experience.map(
      (item) =>
        `${item.position} ${item.company} ${item.description} ${item.achievements.join(" ")} ${item.skills.join(" ")}`,
    ),
    ...profile.projects.map(
      (project) =>
        `${project.name} ${project.description ?? ""} ${project.technologies?.join(" ") ?? ""} ${project.highlights?.join(" ") ?? ""}`,
    ),
    ...profile.education.map((item) => `${item.degree} ${item.field} ${item.institution}`),
    profile.preferences.desiredLocations.join(" "),
  ].join(" ");
  const jobText = [
    job.title,
    job.company.name,
    job.description,
    ...(job.skills ?? []),
    ...profile.preferences.desiredRoles,
  ].join(" ");

  const haystack = normalizeText(`${profileText} ${jobText}`);
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const match of content.matchAll(TECH_TOKEN_REGEX)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (SENTENCE_START_REGEX.test(content.slice(0, index))) continue;
    if (isHeadingLine(content, index)) continue;

    const normalized = normalizeText(token);
    if (normalized.length < 2 || haystack.includes(normalized) || seen.has(normalized)) continue;

    seen.add(normalized);
    warnings.push(token);
    if (warnings.length >= MAX_WARNINGS) break;
  }
  return warnings;
}

/** True when the token sits on a fully-uppercase line (CV section headings). */
function isHeadingLine(content: string, index: number): boolean {
  const lineStart = content.lastIndexOf("\n", index) + 1;
  const lineEnd = content.indexOf("\n", index);
  const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  const letters = line.replace(/[^\p{L}]/gu, "");
  return letters.length > 0 && letters === letters.toUpperCase();
}
