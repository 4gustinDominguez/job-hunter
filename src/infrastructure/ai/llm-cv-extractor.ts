/* oxlint-disable no-await-in-loop -- extraction retries are sequential by contract */
import type { CvExtractorPort } from "@/application/cv/cv-extractor-port";
import type { ProfileDraft } from "@/application/cv/profile-draft-schema";
import { CvExtractionError } from "@/application/errors";
import type { SaveProfileInput } from "@/application/profile/save-profile";
import { buildFactsBlock, extractCvFacts, type CvFacts } from "@/infrastructure/pdf/cv-facts";
import type { ChatClient } from "./chat-client";
import { ChatTimeoutError } from "./chat-client";
import { tryParseDraft } from "./draft-normalize";

const MAX_ATTEMPTS = 2;
const EXTRACTION_TIMEOUT_MS = 120_000;
const EXTRACTION_MAX_TOKENS = 6144;

function buildSystemPrompt(): string {
  return `Extract a candidate profile from the CV text the user sends.
Respond with ONLY one JSON object (no markdown fences, no commentary) with exactly these keys:

{
  "name": string, "email": string, "phone"?: string, "summary"?: string,
  "location"?: {"city"?: string, "region"?: string, "country"?: string},
  "experience": [{"company": string, "position": string, "startDate": "YYYY-MM-DD", "endDate"?: "YYYY-MM-DD", "description"?: string, "achievements"?: string[], "skills"?: string[]}],
  "skills": [{"name": string, "category": "PROGRAMMING"|"FRAMEWORK"|"TOOL"|"SOFT_SKILL"|"LANGUAGE", "level": "BEGINNER"|"INTERMEDIATE"|"ADVANCED"|"EXPERT", "yearsOfExperience"?: number, "lastUsed"?: "YYYY-MM-DD"}],
  "projects": [{"name": string, "description"?: string, "url"?: string, "technologies"?: string[], "highlights"?: string[]}],
  "education": [{"institution": string, "degree": string, "field": string, "startDate": "YYYY-MM-DD", "endDate"?: "YYYY-MM-DD", "achievements"?: string[]}],
  "preferences": {"desiredRoles"?: string[], "desiredLocations"?: string[], "remotePreference"?: "ANY"|"ONSITE"|"HYBRID"|"REMOTE", "salaryExpectation"?: {"minimum": number, "currency": string}, "excludedCompanies"?: string[], "employmentTypes"?: ("FULL_TIME"|"PART_TIME"|"CONTRACT"|"FREELANCE"|"INTERNSHIP")[]}
}

Rules:
- Use ONLY facts explicitly present in the CV. Never invent employers, dates, metrics, skills or contact details.
- When an EXTRACTED FACTS block is provided: copy name/email/phone VERBATIM from it (do not retype or alter them) and categorize EVERY entry of its skills list (keep the original skill names). You may add skills that appear in the CV but not in the list.
- Keep free-text fields (summary, descriptions, achievements) in the CV's original language.
- Partial dates become the first day of the period ("2022-03" → "2022-03-01", "2019" → "2019-01-01").
- For endDate use the last day of the stated period ("2022" → "2022-12-31"); omit endDate only when the CV says present or current.
- Never write null: omit unknown optional keys entirely.
- skills must include EVERY skill listed in the CV — never return an empty skills array unless the CV has no skills at all. skills[].level is REQUIRED for every skill: use the level stated in the CV; when no level is stated, write "INTERMEDIATE". Never omit level.
- preferences: desiredRoles from recent job titles; remotePreference "ANY" unless the CV states one; employmentTypes ["FULL_TIME"] unless stated otherwise; include salaryExpectation only if the CV states a salary.
- Omit unknown optional fields and use [] for arrays with no relevant content.
- Keep output compact: write field values concisely (short phrases, not paragraphs), never repeat keys or content, and do not add commentary outside the JSON.

Abbreviated example: {"name":"…","email":"…","experience":[{"company":"…","position":"…","startDate":"2022-01-01"}],"skills":[{"name":"…","category":"PROGRAMMING","level":"EXPERT"}],"projects":[],"education":[{"institution":"…","degree":"…","field":"…","startDate":"2015-09-01"}],"preferences":{"remotePreference":"ANY"}}`;
}

function toSaveProfileInput(draft: ProfileDraft, facts: CvFacts): SaveProfileInput {
  const location = draft.location;
  const hasLocation = Boolean(location?.city || location?.region || location?.country);
  return {
    // Deterministic merge: facts always win over the model for contact fields.
    name: facts.name ?? draft.name,
    email: facts.email ?? draft.email,
    phone: facts.phone ?? (draft.phone || undefined),
    summary: draft.summary || undefined,
    location:
      hasLocation && location
        ? {
            city: location.city || undefined,
            region: location.region || undefined,
            country: location.country || undefined,
            isRemote: false,
          }
        : undefined,
    experience: draft.experience.map((item) => ({
      ...item,
      id: item.id ?? crypto.randomUUID(),
      startDate: new Date(item.startDate),
      endDate: item.endDate ? new Date(item.endDate) : undefined,
    })),
    skills: draft.skills.map((item) => ({
      ...item,
      id: item.id ?? crypto.randomUUID(),
      lastUsed: item.lastUsed ? new Date(item.lastUsed) : undefined,
    })),
    projects: draft.projects.map((item) => ({
      ...item,
      id: item.id ?? crypto.randomUUID(),
    })),
    education: draft.education.map((item) => ({
      ...item,
      id: item.id ?? crypto.randomUUID(),
      startDate: new Date(item.startDate),
      endDate: item.endDate ? new Date(item.endDate) : undefined,
    })),
    preferences: {
      desiredRoles: draft.preferences.desiredRoles,
      desiredLocations: draft.preferences.desiredLocations,
      remotePreference: draft.preferences.remotePreference,
      salaryExpectation: draft.preferences.salaryExpectation,
      excludedCompanies: draft.preferences.excludedCompanies,
      employmentTypes: draft.preferences.employmentTypes,
    },
  };
}

export class LlmCvExtractor implements CvExtractorPort {
  constructor(
    private readonly chat: ChatClient,
    private readonly readPdfText: (pdf: Uint8Array) => Promise<string>,
  ) {}

  async extract(pdf: Uint8Array): Promise<SaveProfileInput> {
    let text: string;
    try {
      text = await this.readPdfText(pdf);
    } catch {
      throw new CvExtractionError("Could not read the PDF file. Is it a valid, text-based PDF?");
    }
    if (text.trim() === "") {
      throw new CvExtractionError(
        "No selectable text found in the PDF. Scanned or image-only CVs are not supported.",
      );
    }

    const facts = extractCvFacts(text);
    const factsBlock = buildFactsBlock(facts);
    const system = buildSystemPrompt();
    let previousIssue: string | undefined;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const userContent =
        previousIssue === undefined
          ? `${factsBlock}\n\nCV TEXT:\n${text}`
          : `${factsBlock}\n\nCV TEXT:\n${text}\n\nYour previous response was invalid:\n${previousIssue}\nReturn corrected JSON only.`;

      let result: { content: string; truncated: boolean };
      try {
        result = await this.chat.complete(
          [
            { role: "system", content: system },
            { role: "user", content: userContent },
          ],
          { maxTokens: EXTRACTION_MAX_TOKENS, timeoutMs: EXTRACTION_TIMEOUT_MS },
        );
      } catch (error) {
        if (error instanceof ChatTimeoutError) {
          throw new CvExtractionError(
            `The AI took too long (${error.seconds}s) to read this CV. Try again, or check the model in .env (cloud models finish in ~5 s).`,
          );
        }
        throw new CvExtractionError(
          `AI provider request failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      const outcome = tryParseDraft(result.content);
      if (outcome.ok) {
        const factsHasSkills = facts.skillNames.length > 0;
        const draftLostSkills = outcome.draft.skills.length === 0;
        const cvHasSkillsHeading = /^\s*(?:technical\s+)?skills?\s*$/im.test(text);
        if (draftLostSkills && (factsHasSkills || cvHasSkillsHeading)) {
          previousIssue = factsHasSkills
            ? `The skills list in EXTRACTED FACTS came back empty — categorize EVERY listed skill with its category and level.`
            : "The skills came back empty but the CV contains a skills section — include every listed skill with its category and level.";
          console.warn(`[cv-extract] attempt ${attempt + 1} failed:`, previousIssue);
          continue;
        }
        return toSaveProfileInput(outcome.draft, facts);
      }
      previousIssue = result.truncated
        ? "The response was cut short before finishing. Return ONLY the complete JSON object: concise values, no repetition, no commentary."
        : outcome.issue;
      console.warn(`[cv-extract] attempt ${attempt + 1} failed:`, previousIssue);
    }

    throw new CvExtractionError(
      "The AI could not produce a valid profile after two attempts. Try again or use the manual form.",
    );
  }
}
