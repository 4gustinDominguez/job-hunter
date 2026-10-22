import { jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { MATCH_CLASSIFICATIONS } from "@/domain/matching/job-analysis";
import type { JobAnalysis } from "@/domain/matching/job-analysis";
import { jobs } from "./jobs";

export const jobAnalyses = pgTable(
  "job_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    classification: text("classification", { enum: MATCH_CLASSIFICATIONS }).notNull(),
    analysis: jsonb("analysis").$type<JobAnalysis>().notNull(),
    reasoning: text("reasoning").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("job_analyses_job_id_idx").on(table.jobId)],
);
