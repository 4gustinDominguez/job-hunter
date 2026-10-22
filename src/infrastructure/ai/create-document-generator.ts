import type { DocumentGeneratorPort } from "@/application/ports/document-generator-port";
import { createChat } from "./create-chat";
import { LlmDocumentGenerator } from "./llm-document-generator";

export function createDocumentGenerator(): DocumentGeneratorPort {
  const { chat } = createChat();
  return new LlmDocumentGenerator(chat);
}
