import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";

export const applicationQuestions = pgTable(
  "application_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("application_questions_application_id_idx").on(table.applicationId)],
);

export type ApplicationQuestionRow = typeof applicationQuestions.$inferSelect;
