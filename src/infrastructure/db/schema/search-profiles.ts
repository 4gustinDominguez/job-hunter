import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { EMPLOYMENT_TYPES, SENIORITIES } from "@/domain/job/enums";
import { REMOTE_PREFERENCES } from "@/domain/shared/remote-preference";

export const searchProfiles = pgTable("search_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  keywords: text("keywords").array().notNull(),
  locations: text("locations").array().notNull(),
  remotePreference: text("remote_preference", { enum: REMOTE_PREFERENCES }),
  employmentTypes: text("employment_types", { enum: EMPLOYMENT_TYPES }).array(),
  seniority: text("seniority", { enum: SENIORITIES }).array(),
  salaryMin: integer("salary_min"),
  salaryCurrency: text("salary_currency"),
  excludedCompanies: text("excluded_companies").array(),
  excludedKeywords: text("excluded_keywords").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
