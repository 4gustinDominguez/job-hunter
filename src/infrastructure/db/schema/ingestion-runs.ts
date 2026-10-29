import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { INGESTION_RUN_TRIGGERS } from "@/application/ports/ingestion-run-repository-port";
import type { IngestionRunInput } from "@/application/ports/ingestion-run-repository-port";

/**
 * One row per ingestion execution (cron or manual). The app-side cron health
 * signal: "did the 9am run happen, what did it do?" — doubles as the
 * historical record, answering routine questions without external tools.
 */
export const ingestionRuns = pgTable("ingestion_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  trigger: text("trigger", { enum: INGESTION_RUN_TRIGGERS }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }).notNull(),
  durationMs: integer("duration_ms").notNull(),
  fetched: integer("fetched").notNull(),
  created: integer("created").notNull(),
  attached: integer("attached").notNull(),
  skipped: integer("skipped").notNull(),
  prefilterPending: integer("prefilter_pending").notNull(),
  prefilterSkipped: integer("prefilter_skipped").notNull(),
  analysisAnalyzed: integer("analysis_analyzed"),
  analysisFailed: integer("analysis_failed"),
  errors: text("errors").array().notNull().$type<IngestionRunInput["errors"]>(),
});
