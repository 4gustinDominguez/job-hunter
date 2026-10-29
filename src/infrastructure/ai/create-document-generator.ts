import type { DocumentGeneratorPort } from "@/application/ports/document-generator-port";
import type { LoggerPort } from "@/application/ports/logger-port";
import { NOOP_LOGGER } from "@/application/ports/logger-port";
import { createChat } from "./create-chat";
import { LlmDocumentGenerator } from "./llm-document-generator";

export function createDocumentGenerator(logger: LoggerPort = NOOP_LOGGER): DocumentGeneratorPort {
  const { chat } = createChat(process.env.AI_PROVIDER ?? "ollama", logger);
  return new LlmDocumentGenerator(chat);
}
