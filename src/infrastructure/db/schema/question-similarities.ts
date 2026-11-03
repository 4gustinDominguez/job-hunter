import { jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { SimilarityMatch } from "@/domain/application/question-similarity";
import { applicationQuestions } from "./application-questions";

export const questionSimilarities = pgTable(
  "question_similarities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => applicationQuestions.id, { onDelete: "cascade" }),
    matches: jsonb("matches").$type<SimilarityMatch[]>().notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("question_similarities_question_id_idx").on(table.questionId)],
);

export type QuestionSimilarityRow = typeof questionSimilarities.$inferSelect;
