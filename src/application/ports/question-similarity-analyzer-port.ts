import type { SimilarityMatch } from "@/domain/application/question-similarity";

export interface SimilarQuestionCandidate {
  id: string;
  question: string;
  answer: string;
}

/**
 * Compares ONE question against the corpus of previously answered questions
 * and returns the candidates worth reusing. Deterministic port — the LLM
 * lives behind it so the use case stays testable with a fake.
 */
export interface QuestionSimilarityAnalyzerPort {
  readonly provider: string;
  readonly model: string;
  findSimilar(question: string, candidates: SimilarQuestionCandidate[]): Promise<SimilarityMatch[]>;
}
