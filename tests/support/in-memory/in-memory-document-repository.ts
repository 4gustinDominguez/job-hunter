import type { DocumentRepositoryPort } from "@/application/ports/document-repository-port";
import type { DocumentKind, GeneratedDocument } from "@/domain/documents/generated-document";

export class InMemoryDocumentRepository implements DocumentRepositoryPort {
  private readonly docs = new Map<string, GeneratedDocument>();

  private key(applicationId: string, kind: DocumentKind): string {
    return `${applicationId}:${kind}`;
  }

  async get(applicationId: string, kind: DocumentKind): Promise<GeneratedDocument | null> {
    return this.docs.get(this.key(applicationId, kind)) ?? null;
  }

  async listByApplication(applicationId: string): Promise<GeneratedDocument[]> {
    return [...this.docs.values()].filter((doc) => doc.applicationId === applicationId);
  }

  async save(doc: GeneratedDocument): Promise<void> {
    this.docs.set(this.key(doc.applicationId, doc.kind), { ...doc });
  }
}
