import type { QuestionSimilarityAnalyzerPort } from "@/application/ports/question-similarity-analyzer-port";
import type { LoggerPort } from "@/application/ports/logger-port";
import { NOOP_LOGGER } from "@/application/ports/logger-port";
import { createChat } from "./create-chat";
import { LlmQuestionSimilarity } from "./llm-question-similarity";

export function createQuestionSimilarityAnalyzer(
  logger: LoggerPort = NOOP_LOGGER,
): QuestionSimilarityAnalyzerPort {
  const { chat } = createChat(process.env.AI_PROVIDER ?? "ollama", logger);
  return new LlmQuestionSimilarity(chat);
}
