/* oxlint-disable no-await-in-loop -- analysis retries are sequential by contract */
import type { QuestionSimilarityAnalyzerPort } from "@/application/ports/question-similarity-analyzer-port";
import type { SimilarQuestionCandidate } from "@/application/ports/question-similarity-analyzer-port";
import { parseSimilarity } from "@/application/applications/question-similarity-schema";
import { AnalysisError } from "@/application/errors";
import type { SimilarityMatch } from "@/domain/application/question-similarity";
import type { ChatClient } from "./chat-client";
import { ChatTimeoutError } from "./chat-client";
import { extractJsonBlock } from "./json-from-text";

const MAX_ATTEMPTS = 2;
const SIMILARITY_TIMEOUT_MS = 60_000;
const SIMILARITY_MAX_TOKENS = 1536;
/** Candidate answers are truncated so 150 rows still fit a comfortable prompt. */
const MAX_ANSWER_CHARS = 500;

function buildSystemPrompt(): string {
  return `You are an interview-question analyst. You receive ONE NEW QUESTION and a CORPUS of previously asked questions, each with the answer that was given. Decide which corpus questions are similar ENOUGH that their existing answer could be reused or adapted for the NEW QUESTION.

Respond with ONLY one JSON object (no markdown fences, no commentary):

{
  "matches": [{"questionId": string, "reason": string}]
}

Rules:
- questionId must be copied EXACTLY from the corpus — never invent ids.
- Include a match only when answering the corpus question would substantially help answer the NEW QUESTION (same underlying topic, same intent, or directly transferable experience).
- Surface-level word overlap is NOT enough; different topics with similar wording must be excluded.
- reason: one short sentence explaining the overlap.
- Order matches by relevance (best first). Return "matches": [] when nothing qualifies — that is a valid answer.
- Never answer the question yourself; you only match.`;
}

function describeCorpus(candidates: SimilarQuestionCandidate[]): string {
  return candidates
    .map(
      (item) =>
        `ID: ${item.id}\nQUESTION: ${item.question}\nANSWER: ${item.answer.slice(0, MAX_ANSWER_CHARS)}`,
    )
    .join("\n\n");
}

export class LlmQuestionSimilarity implements QuestionSimilarityAnalyzerPort {
  constructor(private readonly chat: ChatClient) {}

  get provider(): string {
    return this.chat.provider;
  }

  get model(): string {
    return this.chat.model;
  }

  async findSimilar(
    question: string,
    candidates: SimilarQuestionCandidate[],
  ): Promise<SimilarityMatch[]> {
    const system = buildSystemPrompt();
    let previousIssue: string | undefined;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const userContent =
        previousIssue === undefined
          ? `NEW QUESTION:\n${question}\n\nCORPUS (${candidates.length} previously answered questions):\n${describeCorpus(candidates)}`
          : `NEW QUESTION:\n${question}\n\nCORPUS (${candidates.length} previously answered questions):\n${describeCorpus(candidates)}\n\nYour previous response was invalid:\n${previousIssue}\nReturn corrected JSON only.`;

      let result: { content: string; truncated: boolean };
      try {
        result = await this.chat.complete(
          [
            { role: "system", content: system },
            { role: "user", content: userContent },
          ],
          { maxTokens: SIMILARITY_MAX_TOKENS, timeoutMs: SIMILARITY_TIMEOUT_MS },
        );
      } catch (error) {
        if (error instanceof ChatTimeoutError) {
          throw new AnalysisError(
            `The AI took too long (${error.seconds}s) to compare questions. Try again later.`,
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
        console.warn(`[similarity] attempt ${attempt + 1} failed:`, previousIssue);
        continue;
      }

      try {
        return parseSimilarity(coerceRawMatches(parsed));
      } catch (error) {
        previousIssue =
          `The JSON does not match the schema: ${error instanceof Error ? error.message : String(error)}`.slice(
            0,
            500,
          );
        console.warn(`[similarity] attempt ${attempt + 1} failed:`, previousIssue);
        console.warn(`[similarity] raw preview:`, JSON.stringify(parsed).slice(0, 600));
      }
    }

    throw new AnalysisError("The AI could not produce a valid match list after two attempts.");
  }
}

/**
 * Coerce common model drift BEFORE schema validation: models often answer
 * `{"id": …}` instead of `{"questionId": …}` or wrap the list in a string.
 */
function coerceRawMatches(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return coerceRawMatches(JSON.parse(raw));
    } catch {
      return raw;
    }
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const obj = { ...(raw as Record<string, unknown>) };
  if (!Array.isArray(obj.matches)) return obj;
  obj.matches = obj.matches.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return entry;
    const item = { ...(entry as Record<string, unknown>) };
    if (typeof item.questionId !== "string" && typeof item.id === "string") {
      item.questionId = item.id;
    }
    if (typeof item.reason !== "string" && typeof item.explanation === "string") {
      item.reason = item.explanation;
    }
    return item;
  });
  return obj;
}
