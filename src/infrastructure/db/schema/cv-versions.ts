import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { candidateProfiles } from "./candidate";
import type { CvSnapshot } from "@/domain/candidate/cv-version";

/**
 * A manual snapshot of the CV (texts + layout) saved from /profile. Loading a
 * version restores the snapshot into the profile; preferences are untouched.
 */
export const cvVersions = pgTable(
  "cv_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    snapshot: jsonb("snapshot").$type<CvSnapshot>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("cv_versions_profile_id_idx").on(table.profileId)],
);
