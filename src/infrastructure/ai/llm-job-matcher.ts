/* oxlint-disable no-await-in-loop -- analysis retries are sequential by contract */
import type { JobMatcherPort } from "@/application/ports/job-matcher-port";
import { parseAnalysis } from "@/application/matching/job-analysis-schema";
import { AnalysisError } from "@/application/errors";
import type { JobAnalysis } from "@/domain/matching/job-analysis";
import type { Job } from "@/domain/job/job";
import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import type { ChatClient } from "./chat-client";
import { ChatTimeoutError } from "./chat-client";

const MAX_ATTEMPTS = 2;
const ANALYSIS_TIMEOUT_MS = 120_000;
const ANALYSIS_MAX_TOKENS = 3072;

function buildSystemPrompt(): string {
  return `You are a job-fit analyst. Compare the JOB against the CANDIDATE PROFILE and respond with ONLY one JSON object (no markdown fences, no commentary):

{
  "classification": "STRONG"|"POTENTIAL"|"WEAK"|"NONE",
  "matched": [{"skill": string, "candidateLevel"?: "BEGINNER"|"INTERMEDIATE"|"ADVANCED"|"EXPERT", "requiredLevel"?: "BEGINNER"|"INTERMEDIATE"|"ADVANCED"|"EXPERT", "status": "matched"|"partial"|"missing"|"unknown"}],
  "gaps": [string],
  "unknowns": [string],
  "experience": [string],
  "location": [string],
  "salary": [string],
  "reasoning": string
}

Rules:
- Use ONLY facts from the JOB and PROFILE. Never invent requirements, skills or dates.
- classification: STRONG = most requirements met; POTENTIAL = relevant but with notable gaps; WEAK = significant misalignment; NONE = fundamentally unrelated (wrong field entirely).
- matched: every requirement/skill the JOB asks for that the CANDIDATE has (status "matched"); "partial" when related but not exact (e.g. level or adjacent tech); "missing" belongs in gaps instead — only use it inside matched when the job lists it as optional.
- gaps: concrete requirements the candidate lacks.
- unknowns: requirements the job mentions without enough detail, or info the job omits that matters (e.g. no seniority stated).
- experience: short observations comparing candidate experience to the role (years, similar roles, relevant work).
- location: short observations vs candidate preferences (remote preference, desired locations).
- salary: short observations vs candidate expectation (only when both sides give data; otherwise omit the array or write one line saying the job does not state salary).
- reasoning: 2-4 sentences, plain language, transparent — why this classification.
- Keep every string short (a phrase, not a paragraph). Never repeat the same item across arrays.`;
}

function describeJob(job: Job): string {
  const lines = [
    `TITLE: ${job.title}`,
    `COMPANY: ${job.company.name}`,
    job.location
      ? `LOCATION: ${[job.location.city, job.location.region, job.location.country].filter(Boolean).join(", ")}${job.location.isRemote ? " (remote ok)" : ""}`
      : undefined,
    job.remoteType ? `REMOTE: ${job.remoteType}` : undefined,
    job.employmentType ? `CONTRACT: ${job.employmentType}` : undefined,
    job.salary
      ? `SALARY: ${[job.salary.minimum, job.salary.maximum].filter((v) => v !== undefined).join("-")} ${job.salary.currency ?? ""} ${job.salary.period ?? ""}`.trim()
      : undefined,
    job.skills && job.skills.length > 0 ? `TAGS: ${job.skills.join(", ")}` : undefined,
    `DESCRIPTION:\n${job.description.slice(0, 6000)}`,
  ];
  return lines.filter((line): line is string => line !== undefined).join("\n");
}

function describeProfile(profile: CandidateProfile): string {
  const skills = profile.skills
    .map((skill) => `${skill.name} (${skill.level.toLowerCase()})`)
    .join(", ");
  const experience = profile.experience
    .map(
      (item) =>
        `${item.position} @ ${item.company} (${item.startDate.toISOString().slice(0, 7)} → ${item.endDate ? item.endDate.toISOString().slice(0, 7) : "present"})`,
    )
    .join("; ");
  const preferences = profile.preferences;
  const lines = [
    profile.summary ? `SUMMARY: ${profile.summary.slice(0, 800)}` : undefined,
    skills ? `SKILLS: ${skills}` : undefined,
    experience ? `EXPERIENCE: ${experience}` : undefined,
    `DESIRED ROLES: ${preferences.desiredRoles.join(", ") || "—"}`,
    `DESIRED LOCATIONS: ${preferences.desiredLocations.join(", ") || "—"}`,
    `REMOTE PREFERENCE: ${preferences.remotePreference}`,
    preferences.salaryExpectation
      ? `SALARY EXPECTATION: minimum ${preferences.salaryExpectation.minimum} ${preferences.salaryExpectation.currency}`
      : undefined,
  ];
  return lines.filter((line): line is string => line !== undefined).join("\n");
}

export class LlmJobMatcher implements JobMatcherPort {
  constructor(private readonly chat: ChatClient) {}

  get provider(): string {
    return this.chat.provider;
  }

  get model(): string {
    return this.chat.model;
  }

  async analyze(job: Job, profile: CandidateProfile): Promise<JobAnalysis> {
    const system = buildSystemPrompt();
    let previousIssue: string | undefined;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const userContent =
        previousIssue === undefined
          ? `CANDIDATE PROFILE:\n${describeProfile(profile)}\n\nJOB:\n${describeJob(job)}`
          : `CANDIDATE PROFILE:\n${describeProfile(profile)}\n\nJOB:\n${describeJob(job)}\n\nYour previous response was invalid:\n${previousIssue}\nReturn corrected JSON only.`;

      let result: { content: string; truncated: boolean };
      try {
        result = await this.chat.complete(
          [
            { role: "system", content: system },
            { role: "user", content: userContent },
          ],
          { maxTokens: ANALYSIS_MAX_TOKENS, timeoutMs: ANALYSIS_TIMEOUT_MS },
        );
      } catch (error) {
        if (error instanceof ChatTimeoutError) {
          throw new AnalysisError(
            `The AI took too long (${error.seconds}s) to analyze this job. Try again later.`,
          );
        }
        throw new AnalysisError(
          `AI provider request failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(extractContentJson(result.content));
      } catch {
        previousIssue = result.truncated
          ? "The response was cut short. Return ONLY the complete JSON object, concise values."
          : "The response was not valid JSON. Return ONLY one JSON object.";
        console.warn(`[analyze] attempt ${attempt + 1} failed:`, previousIssue);
        continue;
      }

      try {
        return parseAnalysis(coerceRawAnalysis(parsed));
      } catch (error) {
        previousIssue =
          `The JSON does not match the schema: ${error instanceof Error ? error.message : String(error)}`.slice(
            0,
            500,
          );
        console.warn(`[analyze] attempt ${attempt + 1} failed:`, previousIssue);
        console.warn(`[analyze] raw preview:`, JSON.stringify(parsed).slice(0, 600));
      }
    }

    throw new AnalysisError("The AI could not produce a valid analysis after two attempts.");
  }
}

function extractContentJson(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1);
  }
  return content.trim();
}

const CLASSIFICATION_ALIASES: Record<string, string> = {
  STRONG_MATCH: "STRONG",
  POTENTIAL_MATCH: "POTENTIAL",
  WEAK_MATCH: "WEAK",
  NO_MATCH: "NONE",
};

const LEVEL_ALIASES: Record<string, string> = {
  A1: "BEGINNER",
  A2: "BEGINNER",
  JUNIOR: "BEGINNER",
  B1: "INTERMEDIATE",
  B2: "INTERMEDIATE",
  MID: "INTERMEDIATE",
  MIDDLE: "INTERMEDIATE",
  GOOD: "INTERMEDIATE",
  C1: "ADVANCED",
  C2: "ADVANCED",
  SENIOR: "ADVANCED",
  EXCELLENT: "EXPERT",
  LEAD: "EXPERT",
  PRINCIPAL: "EXPERT",
};

/**
 * Coerce common model drift (alias classifications, sloppy levels, lowercase
 * statuses) on the raw JSON BEFORE schema validation, so Zod sees canonical
 * values.
 */
function coerceRawAnalysis(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const obj = { ...(raw as Record<string, unknown>) };

  if (typeof obj.classification === "string") {
    const upper = obj.classification.trim().toUpperCase().replace(/\s+/g, "_");
    obj.classification = CLASSIFICATION_ALIASES[upper] ?? upper;
  }

  if (Array.isArray(obj.matched)) {
    obj.matched = obj.matched.map((entry) => {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return entry;
      const item = { ...(entry as Record<string, unknown>) };
      if (typeof item.skill === "string") item.skill = item.skill.trim();
      if (typeof item.status === "string") item.status = item.status.trim().toLowerCase();
      for (const key of ["candidateLevel", "requiredLevel"] as const) {
        const value = item[key];
        if (typeof value === "string") {
          const upper = value.trim().toUpperCase();
          if (
            upper === "" ||
            upper === "UNKNOWN" ||
            upper === "UNSPECIFIED" ||
            upper === "N/A" ||
            upper === "ANY"
          ) {
            delete item[key];
          } else {
            item[key] = LEVEL_ALIASES[upper] ?? upper;
          }
        }
      }
      return item;
    });
  }

  return obj;
}
