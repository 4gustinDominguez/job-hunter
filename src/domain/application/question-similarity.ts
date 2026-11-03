export interface SimilarityMatch {
  /** Id of a previously asked question whose answer can be reused. */
  questionId: string;
  /** One short sentence from the model: why this question is similar. */
  reason: string;
}

export interface QuestionSimilarityRecord {
  questionId: string;
  matches: SimilarityMatch[];
  provider: string;
  model: string;
  createdAt: Date;
}
