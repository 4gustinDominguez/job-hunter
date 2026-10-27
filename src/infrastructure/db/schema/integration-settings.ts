import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { JOB_SOURCE_TYPES } from "@/domain/job/enums";

/**
 * Per-provider job-source settings managed from /integrations: enable toggle,
 * API key (encrypted at rest), geo filter and per-run caps. A missing row means
 * "fall back to env defaults" — the app works before the page is ever opened.
 */
export const integrationSettings = pgTable("integration_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider", { enum: JOB_SOURCE_TYPES }).notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  apiKeyCiphertext: text("api_key_ciphertext"),
  apiKeyHint: text("api_key_hint"),
  countries: text("countries")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  keywords: text("keywords")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  maxItems: integer("max_items"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
