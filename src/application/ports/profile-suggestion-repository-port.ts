import type { ProfileSuggestion, SuggestionStatus } from "@/domain/candidate/profile-suggestion";

export interface ProfileSuggestionRepositoryPort {
  listPending(profileId: string): Promise<ProfileSuggestion[]>;
  getById(id: string): Promise<ProfileSuggestion | null>;
  /** Clears the profile's pending batch and stores the new one (history keeps its statuses). */
  replacePending(profileId: string, suggestions: ProfileSuggestion[]): Promise<void>;
  setStatus(id: string, status: SuggestionStatus): Promise<void>;
}
