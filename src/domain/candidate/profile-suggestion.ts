export const SUGGESTION_CATEGORIES = ["grammar", "style", "clarity", "impact"] as const;
export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export const SUGGESTION_STATUSES = ["pending", "accepted", "dismissed"] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

/**
 * One LLM-proposed edit to one profile text, addressed by `path`
 * (`summary` · `experience:<id>.description` · `experience:<id>.achievements[2]`
 * · `projects:<id>.highlights[1]` · `education:<id>.achievements[0]`).
 */
export interface ProfileSuggestion {
  id: string;
  profileId: string;
  path: string;
  category: SuggestionCategory;
  originalText: string;
  proposedText: string;
  reason: string;
  status: SuggestionStatus;
  createdAt: Date;
}
