import { AnalysisError, ValidationError } from "@/application/errors";
import type { CandidateProfileRepositoryPort } from "@/application/ports/candidate-profile-repository-port";
import type {
  ProfileReviewAnalyzerPort,
  ProfileText,
} from "@/application/ports/profile-review-analyzer-port";
import type { ProfileSuggestionRepositoryPort } from "@/application/ports/profile-suggestion-repository-port";
import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import type { ProfileSuggestion } from "@/domain/candidate/profile-suggestion";

/** Cap on texts sent to the model — keeps the prompt bounded as the CV grows. */
const MAX_TEXTS = 120;

export interface ReviewProfileTextsResult {
  /** Texts handed to the model. */
  reviewed: number;
  /** Suggestions that survived validation and are now pending. */
  created: number;
}

function textTargets(profile: CandidateProfile): ProfileText[] {
  const texts: ProfileText[] = [];
  const push = (path: string, text: string): void => {
    if (texts.length < MAX_TEXTS && text.trim() !== "") texts.push({ path, text });
  };

  push("summary", profile.summary ?? "");
  for (const item of profile.experience) {
    push(`experience:${item.id}.description`, item.description);
    item.achievements.forEach((achievement, index) => {
      push(`experience:${item.id}.achievements[${index}]`, achievement);
    });
  }
  for (const project of profile.projects) {
    push(`projects:${project.id}.description`, project.description);
    project.highlights.forEach((highlight, index) => {
      push(`projects:${project.id}.highlights[${index}]`, highlight);
    });
  }
  for (const education of profile.education) {
    education.achievements?.forEach((achievement, index) => {
      push(`education:${education.id}.achievements[${index}]`, achievement);
    });
  }
  return texts;
}

export class ReviewProfileTexts {
  constructor(
    private readonly profiles: CandidateProfileRepositoryPort,
    private readonly suggestions: ProfileSuggestionRepositoryPort,
    private readonly analyzer: ProfileReviewAnalyzerPort,
  ) {}

  async run(): Promise<ReviewProfileTextsResult> {
    const profile = await this.profiles.findFirst();
    if (!profile) {
      throw new ValidationError("profile", "No profile to review yet — save one first.");
    }
    const texts = textTargets(profile);
    if (texts.length === 0) {
      throw new ValidationError("profile", "There are no CV texts to review yet.");
    }

    const proposals = await this.analyzer.review(texts).catch((error: unknown) => {
      if (error instanceof ValidationError || error instanceof AnalysisError) throw error;
      throw new AnalysisError(
        `AI provider request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

    // The model may hallucinate paths or echo unchanged text — only keep real edits.
    const currentByPath = new Map(texts.map((item) => [item.path, item.text]));
    const seen = new Set<string>();
    const pending: ProfileSuggestion[] = [];
    for (const proposal of proposals) {
      const original = currentByPath.get(proposal.path);
      if (original === undefined || seen.has(proposal.path)) continue;
      if (proposal.proposedText.trim() === original.trim()) continue;
      seen.add(proposal.path);
      pending.push({
        id: crypto.randomUUID(),
        profileId: profile.id,
        path: proposal.path,
        category: proposal.category,
        originalText: original,
        proposedText: proposal.proposedText,
        reason: proposal.reason,
        status: "pending",
        createdAt: new Date(),
      });
    }

    await this.suggestions.replacePending(profile.id, pending);
    return { reviewed: texts.length, created: pending.length };
  }
}
