import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { APPLICATION_STATUSES } from "@/domain/application/enums";
import { jobs } from "./jobs";

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role"),
  company: text("company"),
  linkedin: text("linkedin"),
  notes: text("notes").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    status: text("status", { enum: APPLICATION_STATUSES })
      .notNull()
      .default(APPLICATION_STATUSES[0]),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    cvVersion: text("cv_version"),
    coverLetterVersion: text("cover_letter_version"),
    emailVersion: text("email_version"),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    notes: text("notes").array(),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("applications_job_id_idx").on(table.jobId),
    index("applications_status_idx").on(table.status),
  ],
);
