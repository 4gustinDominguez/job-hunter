import type { ProfileReviewAnalyzerPort } from "@/application/ports/profile-review-analyzer-port";
import type { LoggerPort } from "@/application/ports/logger-port";
import { NOOP_LOGGER } from "@/application/ports/logger-port";
import { createChat } from "./create-chat";
import { LlmProfileReview } from "./llm-profile-review";

export function createProfileReviewAnalyzer(
  logger: LoggerPort = NOOP_LOGGER,
): ProfileReviewAnalyzerPort {
  const { chat } = createChat(process.env.AI_PROVIDER ?? "ollama", logger);
  return new LlmProfileReview(chat);
}
