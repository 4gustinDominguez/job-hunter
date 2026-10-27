import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { IngestionRunError } from "@/domain/job/ingestion-run";
import { INGESTION_RUN_KINDS } from "@/domain/job/enums";

/**
 * One row per cron/manual fetch run (phase 11): the dashboard's "last run"
 * line reads this instead of the user having to open Vercel runtime logs.
 * finished_at stays NULL when a run never completed (crash / timeout) — the
 * most diagnostic state of all.
 */
export const ingestionRuns = pgTable("ingestion_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind", { enum: INGESTION_RUN_KINDS }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  fetched: integer("fetched").notNull().default(0),
  created: integer("created").notNull().default(0),
  attached: integer("attached").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  prefilterQueued: integer("prefilter_queued").notNull().default(0),
  prefilterSkipped: integer("prefilter_skipped").notNull().default(0),
  analyzed: integer("analyzed").notNull().default(0),
  strong: integer("strong").notNull().default(0),
  potential: integer("potential").notNull().default(0),
  weak: integer("weak").notNull().default(0),
  none: integer("none").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  errors: jsonb("errors").$type<IngestionRunError[]>().notNull().default([]),
});
