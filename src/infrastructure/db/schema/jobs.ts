import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { EMPLOYMENT_TYPES, JOB_SOURCE_TYPES, REMOTE_TYPES } from "@/domain/job/enums";
import { ANALYSIS_STATES } from "@/domain/matching/job-analysis";
import type { Location } from "@/domain/shared/location";
import type { SalaryRange } from "@/domain/shared/salary";
import { companies } from "./companies";

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    location: jsonb("location").$type<Location>(),
    remoteType: text("remote_type", { enum: REMOTE_TYPES }),
    salary: jsonb("salary").$type<SalaryRange>(),
    employmentType: text("employment_type", { enum: EMPLOYMENT_TYPES }),
    skills: text("skills").array(),
    contentKey: text("content_key").notNull(),
    notes: text("notes").array().notNull().default([]),
    analysisState: text("analysis_state", { enum: ANALYSIS_STATES }).notNull().default("none"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("jobs_content_key_idx").on(table.contentKey),
    index("jobs_analysis_state_idx").on(table.analysisState),
  ],
);

export const jobListings = pgTable(
  "job_listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    source: text("source", { enum: JOB_SOURCE_TYPES }).notNull(),
    externalId: text("external_id"),
    url: text("url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    discoveredAt: timestamp("discovered_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("job_listings_job_id_idx").on(table.jobId),
    index("job_listings_canonical_url_idx").on(table.canonicalUrl),
    uniqueIndex("job_listings_source_external_id_idx").on(table.source, table.externalId),
  ],
);
