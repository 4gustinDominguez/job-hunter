import type { SuggestionCategory } from "@/domain/candidate/profile-suggestion";

export interface ProfileText {
  path: string;
  text: string;
}

export interface TextSuggestion {
  path: string;
  proposedText: string;
  reason: string;
  category: SuggestionCategory;
}

/**
 * Reviews the profile's own texts and proposes edits (grammar/style/clarity/
 * impact). Deterministic port — the LLM lives behind it so the use case stays
 * testable with a fake.
 */
export interface ProfileReviewAnalyzerPort {
  readonly provider: string;
  readonly model: string;
  review(texts: ProfileText[]): Promise<TextSuggestion[]>;
}
