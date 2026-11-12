/* oxlint-disable no-await-in-loop -- review retries are sequential by contract */
import type { ProfileReviewAnalyzerPort } from "@/application/ports/profile-review-analyzer-port";
import type { ProfileText, TextSuggestion } from "@/application/ports/profile-review-analyzer-port";
import { parseProfileReview } from "@/application/profile/profile-suggestion-schema";
import { AnalysisError } from "@/application/errors";
import { SUGGESTION_CATEGORIES } from "@/domain/candidate/profile-suggestion";
import type { ChatClient } from "./chat-client";
import { ChatTimeoutError } from "./chat-client";
import { extractJsonBlock } from "./json-from-text";

const MAX_ATTEMPTS = 2;
const REVIEW_TIMEOUT_MS = 120_000;
const REVIEW_MAX_TOKENS = 4096;
/** Single texts longer than this are truncated so the whole CV fits the prompt. */
const MAX_TEXT_CHARS = 4000;

function buildSystemPrompt(): string {
  return `You are a CV copy editor. You receive a list of TEXTS from a real person's CV, each identified by a PATH. You improve how they are WRITTEN — never what they claim.

Respond with ONLY one JSON object (no markdown fences, no commentary):

{
  "suggestions": [{"path": string, "proposedText": string, "reason": string, "category": "grammar"|"style"|"clarity"|"impact"}]
}

Rules:
- proposedText is the COMPLETE replacement text for that path — not a diff, not a fragment. Keep the SAME LANGUAGE as the original text.
- category: grammar (spelling, punctuation, grammar) · style (word choice, active verbs, tone) · clarity (structure, ambiguity, redundancy) · impact (weak phrasing — strengthen the wording, but never invent numbers).
- ABSOLUTE: never invent employers, dates, job titles, metrics, achievements, skills or ANY fact not present in the original text. Only rephrase, reorder, merge or trim what already exists.
- Only propose when there is a REAL improvement. Leave clean texts out — return "suggestions": [] when nothing qualifies; that is a valid answer.
- path must be copied EXACTLY from the input — never invent paths. At most one suggestion per path.
- reason: one short sentence in the same language as the text, saying what you improved.`;
}

function describeTexts(texts: ProfileText[]): string {
  return texts
    .map((item) => `PATH: ${item.path}\nTEXT:\n${item.text.slice(0, MAX_TEXT_CHARS)}`)
    .join("\n\n---\n\n");
}

export class LlmProfileReview implements ProfileReviewAnalyzerPort {
  constructor(private readonly chat: ChatClient) {}

  get provider(): string {
    return this.chat.provider;
  }

  get model(): string {
    return this.chat.model;
  }

  async review(texts: ProfileText[]): Promise<TextSuggestion[]> {
    const system = buildSystemPrompt();
    const corpus = `CV TEXTS (${texts.length}):\n\n${describeTexts(texts)}`;
    let previousIssue: string | undefined;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const userContent =
        previousIssue === undefined
          ? corpus
          : `${corpus}\n\nYour previous response was invalid:\n${previousIssue}\nReturn corrected JSON only.`;

      let result: { content: string; truncated: boolean };
      try {
        result = await this.chat.complete(
          [
            { role: "system", content: system },
            { role: "user", content: userContent },
          ],
          { maxTokens: REVIEW_MAX_TOKENS, timeoutMs: REVIEW_TIMEOUT_MS },
        );
      } catch (error) {
        if (error instanceof ChatTimeoutError) {
          throw new AnalysisError(
            `The AI took too long (${error.seconds}s) to review the CV. Try again later.`,
          );
        }
        throw new AnalysisError(
          `AI provider request failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(extractJsonBlock(result.content));
      } catch {
        previousIssue = result.truncated
          ? "The response was cut short. Return ONLY the complete JSON object."
          : "The response was not valid JSON. Return ONLY one JSON object.";
        console.warn(`[profile-review] attempt ${attempt + 1} failed:`, previousIssue);
        continue;
      }

      try {
        return parseProfileReview(coerceRawSuggestions(parsed));
      } catch (error) {
        previousIssue =
          `The JSON does not match the schema: ${error instanceof Error ? error.message : String(error)}`.slice(
            0,
            500,
          );
        console.warn(`[profile-review] attempt ${attempt + 1} failed:`, previousIssue);
        console.warn(`[profile-review] raw preview:`, JSON.stringify(parsed).slice(0, 600));
      }
    }

    throw new AnalysisError("The AI could not produce valid CV suggestions after two attempts.");
  }
}

/** Coerce common model drift BEFORE schema validation (naming, casing, wrappers). */
function coerceRawSuggestions(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return coerceRawSuggestions(JSON.parse(raw));
    } catch {
      return raw;
    }
  }
  if (Array.isArray(raw)) return { suggestions: raw };
  if (typeof raw !== "object" || raw === null) return raw;

  const obj = { ...(raw as Record<string, unknown>) };
  if (!Array.isArray(obj.suggestions)) {
    for (const key of ["suggestionsList", "edits", "improvements"]) {
      if (Array.isArray(obj[key])) {
        obj.suggestions = obj[key];
        break;
      }
    }
  }
  if (!Array.isArray(obj.suggestions)) return obj;

  obj.suggestions = obj.suggestions.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return entry;
    const item = { ...(entry as Record<string, unknown>) };
    if (typeof item.path !== "string" && typeof item.id === "string") item.path = item.id;
    if (typeof item.proposedText !== "string") {
      for (const key of ["text", "newText", "improvedText", "rewrite"]) {
        if (typeof item[key] === "string") {
          item.proposedText = item[key];
          break;
        }
      }
    }
    if (typeof item.reason !== "string") {
      for (const key of ["explanation", "why", "rationale"]) {
        if (typeof item[key] === "string") {
          item.reason = item[key];
          break;
        }
      }
    }
    if (typeof item.category === "string") {
      const category = item.category.toLowerCase();
      item.category = (SUGGESTION_CATEGORIES as readonly string[]).includes(category)
        ? category
        : "style";
    }
    return item;
  });
  return obj;
}
