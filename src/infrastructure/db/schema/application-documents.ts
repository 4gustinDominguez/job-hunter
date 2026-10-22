import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { DOCUMENT_KINDS } from "@/domain/documents/generated-document";
import type { DocumentKind } from "@/domain/documents/generated-document";
import { applications } from "./applications";

export const applicationDocuments = pgTable(
  "application_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: DOCUMENT_KINDS }).notNull(),
    content: text("content").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("application_documents_app_kind_idx").on(table.applicationId, table.kind),
  ],
);

export type ApplicationDocumentRow = typeof applicationDocuments.$inferSelect;
export type DocumentKindValue = DocumentKind;
