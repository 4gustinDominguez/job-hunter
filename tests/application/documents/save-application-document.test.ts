import { beforeEach, describe, expect, it } from "vitest";
import { SaveApplicationDocument } from "@/application/documents/save-application-document";
import { ValidationError } from "@/application/errors";
import type { GeneratedDocument } from "@/domain/documents/generated-document";
import { InMemoryDocumentRepository } from "../../support/in-memory/in-memory-document-repository";

function makeDoc(overrides: Partial<GeneratedDocument> = {}): GeneratedDocument {
  return {
    id: "doc-1",
    applicationId: "app-1",
    kind: "COVER_LETTER",
    content: "Original content",
    provider: "ollama",
    model: "gemma4:31b-cloud",
    createdAt: new Date("2026-10-21T10:00:00Z"),
    updatedAt: new Date("2026-10-21T10:00:00Z"),
    ...overrides,
  };
}

describe("SaveApplicationDocument", () => {
  let documents: InMemoryDocumentRepository;
  let useCase: SaveApplicationDocument;

  beforeEach(() => {
    documents = new InMemoryDocumentRepository();
    useCase = new SaveApplicationDocument(documents);
  });

  it("updates the content, trims it and keeps the generation metadata", async () => {
    const original = makeDoc();
    await documents.save(original);

    const saved = await useCase.run("app-1", "COVER_LETTER", "  Edited by me  ");

    expect(saved.content).toBe("Edited by me");
    expect(saved.provider).toBe("ollama");
    expect(saved.model).toBe("gemma4:31b-cloud");
    expect(saved.createdAt).toEqual(original.createdAt);
    expect(saved.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime());
    expect((await documents.get("app-1", "COVER_LETTER"))?.content).toBe("Edited by me");
  });

  it("rejects empty content", async () => {
    await documents.save(makeDoc());

    await expect(useCase.run("app-1", "COVER_LETTER", "   ")).rejects.toThrowError(ValidationError);
  });

  it("requires a generated document before editing", async () => {
    await expect(useCase.run("app-1", "COVER_LETTER", "text")).rejects.toThrowError(
      /Generate the document/,
    );
  });
});
