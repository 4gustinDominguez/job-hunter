import type { QuestionSimilarityRecord } from "@/domain/application/question-similarity";

export interface QuestionSimilarityRepositoryPort {
  getMany(questionIds: string[]): Promise<Map<string, QuestionSimilarityRecord>>;
  save(questionId: string, record: Omit<QuestionSimilarityRecord, "questionId">): Promise<void>;
}
