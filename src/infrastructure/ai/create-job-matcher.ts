import type { JobMatcherPort } from "@/application/ports/job-matcher-port";
import type { LoggerPort } from "@/application/ports/logger-port";
import { NOOP_LOGGER } from "@/application/ports/logger-port";
import { createChat } from "./create-chat";
import { LlmJobMatcher } from "./llm-job-matcher";

export function createJobMatcher(logger: LoggerPort = NOOP_LOGGER): JobMatcherPort {
  const { chat } = createChat(process.env.AI_PROVIDER ?? "ollama", logger);
  return new LlmJobMatcher(chat);
}
