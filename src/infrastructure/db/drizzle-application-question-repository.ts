import { asc, eq, sql } from "drizzle-orm";
import { NotFoundError } from "@/application/errors";
import type {
  ApplicationQuestionRepositoryPort,
  NewApplicationQuestion,
} from "@/application/ports/application-question-repository-port";
import type { ApplicationQuestion } from "@/domain/application/application-question";
import type { db } from "./client";
import { applicationQuestions } from "./schema";

type Db = typeof db;
type Row = typeof applicationQuestions.$inferSelect;

function toDomain(row: Row): ApplicationQuestion {
  return {
    id: row.id,
    applicationId: row.applicationId,
    question: row.question,
    answer: row.answer ?? undefined,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleApplicationQuestionRepository implements ApplicationQuestionRepositoryPort {
  constructor(private readonly database: Db) {}

  async listByApplication(applicationId: string): Promise<ApplicationQuestion[]> {
    const rows = await this.database
      .select()
      .from(applicationQuestions)
      .where(eq(applicationQuestions.applicationId, applicationId))
      .orderBy(asc(applicationQuestions.position), asc(applicationQuestions.createdAt));
    return rows.map(toDomain);
  }

  async getById(id: string): Promise<ApplicationQuestion | null> {
    const [row] = await this.database
      .select()
      .from(applicationQuestions)
      .where(eq(applicationQuestions.id, id))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async add(
    applicationId: string,
    items: NewApplicationQuestion[],
  ): Promise<ApplicationQuestion[]> {
    const [{ maxPosition }] = await this.database
      .select({
        maxPosition: sql<number>`coalesce(max(${applicationQuestions.position}), -1)`,
      })
      .from(applicationQuestions)
      .where(eq(applicationQuestions.applicationId, applicationId));
    let position = maxPosition + 1;
    const rows = await this.database
      .insert(applicationQuestions)
      .values(
        items.map((item) => ({
          applicationId,
          question: item.question,
          answer: item.answer ?? null,
          position: position++,
        })),
      )
      .returning();
    return rows.map(toDomain);
  }

  async saveAnswer(id: string, answer: string): Promise<ApplicationQuestion> {
    const [row] = await this.database
      .update(applicationQuestions)
      .set({ answer })
      .where(eq(applicationQuestions.id, id))
      .returning();
    if (!row) {
      throw new NotFoundError("ApplicationQuestion", id);
    }
    return toDomain(row);
  }

  async remove(id: string): Promise<void> {
    await this.database.delete(applicationQuestions).where(eq(applicationQuestions.id, id));
  }
}
