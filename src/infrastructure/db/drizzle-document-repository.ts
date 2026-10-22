import { and, asc, eq } from "drizzle-orm";
import type { DocumentRepositoryPort } from "@/application/ports/document-repository-port";
import type { DocumentKind, GeneratedDocument } from "@/domain/documents/generated-document";
import type { db } from "./client";
import { applicationDocuments } from "./schema";

type Db = typeof db;
type DocumentRow = typeof applicationDocuments.$inferSelect;

function toDomain(row: DocumentRow): GeneratedDocument {
  return {
    id: row.id,
    applicationId: row.applicationId,
    kind: row.kind,
    content: row.content,
    provider: row.provider,
    model: row.model,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleDocumentRepository implements DocumentRepositoryPort {
  constructor(private readonly database: Db) {}

  async get(applicationId: string, kind: DocumentKind): Promise<GeneratedDocument | null> {
    const [row] = await this.database
      .select()
      .from(applicationDocuments)
      .where(
        and(
          eq(applicationDocuments.applicationId, applicationId),
          eq(applicationDocuments.kind, kind),
        ),
      )
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async listByApplication(applicationId: string): Promise<GeneratedDocument[]> {
    const rows = await this.database
      .select()
      .from(applicationDocuments)
      .where(eq(applicationDocuments.applicationId, applicationId))
      .orderBy(asc(applicationDocuments.kind));
    return rows.map(toDomain);
  }

  async save(doc: GeneratedDocument): Promise<void> {
    const values = {
      kind: doc.kind,
      content: doc.content,
      provider: doc.provider,
      model: doc.model,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
    await this.database
      .insert(applicationDocuments)
      .values({ id: doc.id, applicationId: doc.applicationId, ...values })
      .onConflictDoUpdate({
        target: [applicationDocuments.applicationId, applicationDocuments.kind],
        set: { ...values, updatedAt: doc.updatedAt },
      });
  }
}
