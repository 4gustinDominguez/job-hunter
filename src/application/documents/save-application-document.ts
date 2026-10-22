import type { DocumentRepositoryPort } from "@/application/ports/document-repository-port";
import { ValidationError } from "@/application/errors";
import type { DocumentKind, GeneratedDocument } from "@/domain/documents/generated-document";

export class SaveApplicationDocument {
  constructor(private readonly documents: DocumentRepositoryPort) {}

  async run(
    applicationId: string,
    kind: DocumentKind,
    content: string,
  ): Promise<GeneratedDocument> {
    const trimmed = content.trim();
    if (trimmed === "") {
      throw new ValidationError("content", "Document cannot be empty.");
    }
    const existing = await this.documents.get(applicationId, kind);
    if (!existing) {
      throw new ValidationError("document", "Generate the document before editing it.");
    }
    const updated: GeneratedDocument = {
      ...existing,
      content: trimmed,
      updatedAt: new Date(),
    };
    await this.documents.save(updated);
    return updated;
  }
}
