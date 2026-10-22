/* oxlint-disable no-await-in-loop -- generation retries are sequential by contract */
import type { DocumentGeneratorPort } from "@/application/ports/document-generator-port";
import { DocumentGenerationError } from "@/application/errors";
import type { DocumentKind } from "@/domain/documents/generated-document";
import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import type { JobAnalysis } from "@/domain/matching/job-analysis";
import type { Job } from "@/domain/job/job";
import type { ChatClient } from "./chat-client";
import { ChatTimeoutError } from "./chat-client";

const MAX_ATTEMPTS = 2;
const GENERATION_TIMEOUT_MS = 120_000;
const GENERATION_MAX_TOKENS = 4096;

const CONTRACT = `CONTRACT (non-negotiable):
Allowed: reorder relevant skills · emphasize relevant experience · rephrase existing achievements · select relevant projects · adjust the professional summary · remove irrelevant information.
Prohibited: add skills or experience not in PROFILE · invent achievements, metrics or employers · modify employment history (companies, titles and dates stay EXACTLY as in PROFILE) · create false qualifications · claim knowledge not evidenced in PROFILE.
Write in the same language as the JOB description. Output ONLY the document text — no markdown fences, no preamble, no commentary.`;

function coverLetterRules(): string {
  return `KIND: COVER LETTER (180–320 words, plain text).
- Specific to THIS position and company: reference concrete requirements from the JOB.
- Open directly with relevance to the role; no "I am writing to express my enthusiastic interest", no cliché openers ("leverage my skills", "fast-paced environment", "dynamic team", "hit the ground running").
- Connect 2–4 concrete PROFILE facts to the JOB's needs.
- If the candidate is not stated as the author's contact person, address the "Hiring team" — never invent a person's name.
- End with a simple call to meet; no fake enthusiasm.`;
}

function tailoredCvRules(): string {
  return `KIND: TAILORED CV (plain text, section headings in ALL CAPS).
Structure: CONTACT (name, email, phone, location) → PROFESSIONAL SUMMARY (adjusted to this role) → TECHNICAL SKILLS (reordered so the JOB-relevant ones come first) → EXPERIENCE (every role kept, dates verbatim; rephrase bullets to emphasize what matters for THIS job) → PROJECTS (only the relevant ones) → EDUCATION → LANGUAGES if present in PROFILE.
Never drop a job from EXPERIENCE — tailoring means emphasis, not omission of employment history.`;
}

function describeJob(job: Job): string {
  const lines = [
    `TITLE: ${job.title}`,
    `COMPANY: ${job.company.name}`,
    job.location
      ? `LOCATION: ${[job.location.city, job.location.region, job.location.country].filter(Boolean).join(", ")}${job.location.isRemote ? " (remote ok)" : ""}`
      : undefined,
    job.remoteType ? `REMOTE: ${job.remoteType}` : undefined,
    job.salary
      ? `SALARY: ${[job.salary.minimum, job.salary.maximum].filter((v) => v !== undefined).join("-")} ${job.salary.currency ?? ""}`.trim()
      : undefined,
    job.skills && job.skills.length > 0 ? `TAGS: ${job.skills.join(", ")}` : undefined,
    `DESCRIPTION:\n${job.description.slice(0, 8000)}`,
  ];
  return lines.filter((line): line is string => line !== undefined).join("\n");
}

function describeProfile(profile: CandidateProfile): string {
  const experience = profile.experience
    .map((item) => {
      const achievements =
        item.achievements.length > 0 ? `\n  Achievements: ${item.achievements.join(" | ")}` : "";
      return `- ${item.position} @ ${item.company} (${item.startDate.toISOString().slice(0, 7)} → ${item.endDate ? item.endDate.toISOString().slice(0, 7) : "present"})\n  ${item.description}${achievements}\n  Stack: ${item.skills.join(", ") || "—"}`;
    })
    .join("\n");
  const skills = profile.skills
    .map((skill) => `${skill.name} (${skill.level.toLowerCase()})`)
    .join(", ");
  const projects = profile.projects
    .map(
      (project) =>
        `- ${project.name}: ${project.description ?? ""}${project.technologies?.length ? ` [${project.technologies.join(", ")}]` : ""}`,
    )
    .join("\n");
  const education = profile.education
    .map(
      (item) =>
        `- ${item.degree}, ${item.field} @ ${item.institution} (${item.startDate.toISOString().slice(0, 4)} → ${item.endDate ? item.endDate.toISOString().slice(0, 4) : "present"})`,
    )
    .join("\n");

  const lines = [
    `NAME: ${profile.name}`,
    `EMAIL: ${profile.email}`,
    profile.phone ? `PHONE: ${profile.phone}` : undefined,
    profile.location
      ? `LOCATION: ${[profile.location.city, profile.location.region, profile.location.country].filter(Boolean).join(", ")}`
      : undefined,
    profile.summary ? `SUMMARY: ${profile.summary}` : undefined,
    `SKILLS: ${skills || "—"}`,
    `EXPERIENCE:\n${experience || "—"}`,
    projects ? `PROJECTS:\n${projects}` : undefined,
    education ? `EDUCATION:\n${education}` : undefined,
    `PREFERENCES: desired roles = ${profile.preferences.desiredRoles.join(", ") || "—"}; remote = ${profile.preferences.remotePreference}`,
  ];
  return lines.filter((line): line is string => line !== undefined).join("\n");
}

function describeAnalysis(analysis: JobAnalysis): string {
  const lines = [
    `CLASSIFICATION: ${analysis.classification}`,
    analysis.matched.length > 0
      ? `MATCHED: ${analysis.matched.map((match) => match.skill).join(", ")}`
      : undefined,
    analysis.gaps.length > 0 ? `GAPS: ${analysis.gaps.join(", ")}` : undefined,
    analysis.reasoning ? `REASONING: ${analysis.reasoning}` : undefined,
  ];
  return lines.filter((line): line is string => line !== undefined).join("\n");
}

export class LlmDocumentGenerator implements DocumentGeneratorPort {
  constructor(private readonly chat: ChatClient) {}

  get provider(): string {
    return this.chat.provider;
  }

  get model(): string {
    return this.chat.model;
  }

  async generate(
    kind: DocumentKind,
    job: Job,
    profile: CandidateProfile,
    analysis?: JobAnalysis,
  ): Promise<string> {
    const system = [
      "You write application documents for a job candidate using ONLY the PROFILE provided.",
      CONTRACT,
      kind === "COVER_LETTER" ? coverLetterRules() : tailoredCvRules(),
    ].join("\n\n");

    const userContent = [
      `PROFILE:\n${describeProfile(profile)}`,
      `JOB:\n${describeJob(job)}`,
      analysis
        ? `FIT ANALYSIS (context — target the strengths, do not overclaim gaps):\n${describeAnalysis(analysis)}`
        : undefined,
      `Write the ${kind === "COVER_LETTER" ? "cover letter" : "tailored CV"} now.`,
    ]
      .filter((block): block is string => block !== undefined)
      .join("\n\n");

    let previousIssue: string | undefined;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const turns = [
        { role: "system" as const, content: system },
        {
          role: "user" as const,
          content:
            previousIssue === undefined
              ? userContent
              : `${userContent}\n\nYour previous response was unusable: ${previousIssue}\nReturn the document text only.`,
        },
      ];

      let result: { content: string; truncated: boolean };
      try {
        result = await this.chat.complete(turns, {
          maxTokens: GENERATION_MAX_TOKENS,
          timeoutMs: GENERATION_TIMEOUT_MS,
        });
      } catch (error) {
        if (error instanceof ChatTimeoutError) {
          throw new DocumentGenerationError(
            `The AI took too long (${error.seconds}s) to generate the document. Try again.`,
          );
        }
        throw new DocumentGenerationError(
          `AI provider request failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      const content = stripFences(result.content);
      if (content.trim() === "") {
        previousIssue = "the document was empty";
        console.warn(`[generate-doc] attempt ${attempt + 1} failed: empty content`);
        continue;
      }
      if (result.truncated) {
        previousIssue =
          "the document was cut short before finishing — make it more concise and complete";
        console.warn(`[generate-doc] attempt ${attempt + 1} failed: truncated`);
        continue;
      }
      return content;
    }

    throw new DocumentGenerationError(
      "The AI could not produce a usable document after two attempts. Try again.",
    );
  }
}

function stripFences(content: string): string {
  const fenced = content.match(/^\s*```(?:markdown|md|text)?\s*\n([\s\S]*?)\n```\s*$/);
  if (fenced?.[1]) return fenced[1].trim();
  return content.trim();
}
