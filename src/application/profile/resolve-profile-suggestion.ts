import { NotFoundError, ValidationError } from "@/application/errors";
import type { CandidateProfileRepositoryPort } from "@/application/ports/candidate-profile-repository-port";
import type { ProfileSuggestionRepositoryPort } from "@/application/ports/profile-suggestion-repository-port";
import type { SaveProfile } from "@/application/profile/save-profile";
import type { ProfileSuggestion } from "@/domain/candidate/profile-suggestion";
import {
  parseSuggestionPath,
  readSuggestionText,
  writeSuggestionText,
} from "@/domain/candidate/suggestion-path";

export type SuggestionDecision = "accept" | "dismiss";

export class ResolveProfileSuggestion {
  constructor(
    private readonly profiles: CandidateProfileRepositoryPort,
    private readonly suggestions: ProfileSuggestionRepositoryPort,
    private readonly saveProfile: SaveProfile,
  ) {}

  async run(
    suggestionId: string,
    decision: SuggestionDecision,
    replacement?: string,
  ): Promise<ProfileSuggestion> {
    const suggestion = await this.suggestions.getById(suggestionId);
    if (!suggestion) {
      throw new NotFoundError("ProfileSuggestion", suggestionId);
    }
    if (suggestion.status !== "pending") {
      throw new ValidationError("suggestion", "This suggestion was already handled.");
    }

    if (decision === "dismiss") {
      await this.suggestions.setStatus(suggestionId, "dismissed");
      return { ...suggestion, status: "dismissed" };
    }

    const profile = await this.profiles.findFirst();
    if (!profile) {
      throw new ValidationError("suggestion", "There is no profile to apply this to.");
    }
    const path = parseSuggestionPath(suggestion.path);
    const current = path ? readSuggestionText(profile, path) : undefined;
    if (current === undefined || current !== suggestion.originalText) {
      throw new ValidationError(
        "suggestion",
        "The profile changed since this review — run the review again.",
      );
    }

    const text = replacement ?? suggestion.proposedText;
    if (text.trim() === "") {
      throw new ValidationError("text", "The text to apply can't be empty.");
    }
    const updated = path ? writeSuggestionText(profile, path, text) : profile;
    await this.saveProfile.run(updated);
    await this.suggestions.setStatus(suggestionId, "accepted");
    return { ...suggestion, status: "accepted" };
  }
}
