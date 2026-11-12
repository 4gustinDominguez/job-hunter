import { z } from "zod";
import type { TextSuggestion } from "@/application/ports/profile-review-analyzer-port";
import { SUGGESTION_CATEGORIES } from "@/domain/candidate/profile-suggestion";

const reviewSuggestionSchema = z.object({
  path: z.string().trim().min(1),
  proposedText: z.string().min(1),
  reason: z.string().trim().min(1),
  category: z.enum(SUGGESTION_CATEGORIES).default("style"),
});

export const profileReviewSchema = z.object({
  suggestions: z.array(reviewSuggestionSchema).default([]),
});

export type ProfileReviewDraft = z.infer<typeof profileReviewSchema>;

export function parseProfileReview(value: unknown): TextSuggestion[] {
  return profileReviewSchema.parse(value).suggestions;
}
