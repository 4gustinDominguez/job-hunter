import { customType, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Postgres bytea (drizzle-orm has no built-in for it in this version). */
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

/**
 * The uploaded CV file on record. Single-row semantics (delete-then-insert on
 * save) — mirrors the one-profile invariant; kept out of `candidate_profiles`
 * so routine profile queries never drag PDF bytes along. Postgres bytea (not
 * disk) so the file survives Vercel deploys in Phase 10.
 */
export const uploadedCvs = pgTable("uploaded_cvs", {
  id: uuid("id").defaultRandom().primaryKey(),
  filename: text("filename").notNull(),
  content: bytea("content").notNull(),
  size: integer("size").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
});
