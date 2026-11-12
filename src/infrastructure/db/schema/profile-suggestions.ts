import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { candidateProfiles } from "./candidate";
import { SUGGESTION_CATEGORIES, SUGGESTION_STATUSES } from "@/domain/candidate/profile-suggestion";

/**
 * One LLM-proposed edit to one profile text (see ProfileSuggestion). Pending
 * ones drive the Suggestions panel on /profile; accepting writes the proposed
 * text into the profile and flips the status.
 */
export const profileSuggestions = pgTable(
  "profile_suggestions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    category: text("category", { enum: SUGGESTION_CATEGORIES }).notNull(),
    originalText: text("original_text").notNull(),
    proposedText: text("proposed_text").notNull(),
    reason: text("reason").notNull(),
    status: text("status", { enum: SUGGESTION_STATUSES }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("profile_suggestions_profile_id_idx").on(table.profileId)],
);
