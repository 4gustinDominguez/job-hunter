import type { QuestionSimilarityRepositoryPort } from "@/application/ports/question-similarity-repository-port";
import type { QuestionSimilarityRecord } from "@/domain/application/question-similarity";

export class InMemoryQuestionSimilarityRepository implements QuestionSimilarityRepositoryPort {
  readonly items = new Map<string, QuestionSimilarityRecord>();

  async getMany(questionIds: string[]): Promise<Map<string, QuestionSimilarityRecord>> {
    const map = new Map<string, QuestionSimilarityRecord>();
    for (const id of questionIds) {
      const record = this.items.get(id);
      if (record) map.set(id, record);
    }
    return map;
  }

  async save(
    questionId: string,
    record: Omit<QuestionSimilarityRecord, "questionId">,
  ): Promise<void> {
    this.items.set(questionId, { questionId, ...record });
  }
}
