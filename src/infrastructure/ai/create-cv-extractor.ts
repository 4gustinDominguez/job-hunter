import type { CvExtractorPort } from "@/application/cv/cv-extractor-port";
import { extractPdfText } from "@/infrastructure/pdf/pdf-text";
import { createChat } from "./create-chat";
import { LlmCvExtractor } from "./llm-cv-extractor";

export function createCvExtractor(): CvExtractorPort {
  const { chat } = createChat();
  return new LlmCvExtractor(chat, extractPdfText);
}
