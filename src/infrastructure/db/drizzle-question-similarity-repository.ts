import { inArray } from "drizzle-orm";
import type { QuestionSimilarityRepositoryPort } from "@/application/ports/question-similarity-repository-port";
import type { QuestionSimilarityRecord } from "@/domain/application/question-similarity";
import type { db } from "./client";
import { questionSimilarities } from "./schema";

type Db = typeof db;
type Row = typeof questionSimilarities.$inferSelect;

function toRecord(row: Row): QuestionSimilarityRecord {
  return {
    questionId: row.questionId,
    matches: row.matches,
    provider: row.provider,
    model: row.model,
    createdAt: row.createdAt,
  };
}

export class DrizzleQuestionSimilarityRepository implements QuestionSimilarityRepositoryPort {
  constructor(private readonly database: Db) {}

  async getMany(questionIds: string[]): Promise<Map<string, QuestionSimilarityRecord>> {
    const map = new Map<string, QuestionSimilarityRecord>();
    if (questionIds.length === 0) return map;
    const rows = await this.database
      .select()
      .from(questionSimilarities)
      .where(inArray(questionSimilarities.questionId, questionIds));
    for (const row of rows) {
      map.set(row.questionId, toRecord(row));
    }
    return map;
  }

  async save(
    questionId: string,
    record: Omit<QuestionSimilarityRecord, "questionId">,
  ): Promise<void> {
    const values = {
      matches: record.matches,
      provider: record.provider,
      model: record.model,
      createdAt: record.createdAt,
    };
    await this.database
      .insert(questionSimilarities)
      .values({ questionId, ...values })
      .onConflictDoUpdate({ target: questionSimilarities.questionId, set: values });
  }
}
