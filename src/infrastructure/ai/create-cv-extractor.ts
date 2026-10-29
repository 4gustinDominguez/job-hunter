import type { CvExtractorPort } from "@/application/cv/cv-extractor-port";
import type { LoggerPort } from "@/application/ports/logger-port";
import { NOOP_LOGGER } from "@/application/ports/logger-port";
import { extractPdfText } from "@/infrastructure/pdf/pdf-text";
import { createChat } from "./create-chat";
import { LlmCvExtractor } from "./llm-cv-extractor";

export function createCvExtractor(logger: LoggerPort = NOOP_LOGGER): CvExtractorPort {
  const { chat } = createChat(process.env.AI_PROVIDER ?? "ollama", logger);
  return new LlmCvExtractor(chat, extractPdfText);
}
