import { z } from "zod";
import type { SimilarityMatch } from "@/domain/application/question-similarity";

const similarityMatchSchema = z.object({
  questionId: z.string().trim().min(1),
  reason: z.string().trim().min(1),
});

export const questionSimilaritySchema = z.object({
  matches: z.array(similarityMatchSchema).default([]),
});

export type QuestionSimilarityDraft = z.infer<typeof questionSimilaritySchema>;

export function parseSimilarity(value: unknown): SimilarityMatch[] {
  return questionSimilaritySchema.parse(value).matches;
}
