import type { DocumentKind, GeneratedDocument } from "@/domain/documents/generated-document";

export interface DocumentRepositoryPort {
  get(applicationId: string, kind: DocumentKind): Promise<GeneratedDocument | null>;
  listByApplication(applicationId: string): Promise<GeneratedDocument[]>;
  /** Upsert on (applicationId, kind) — one current document per kind per application. */
  save(doc: GeneratedDocument): Promise<void>;
}
