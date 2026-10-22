import type { JobMatcherPort } from "@/application/ports/job-matcher-port";
import { createChat } from "./create-chat";
import { LlmJobMatcher } from "./llm-job-matcher";

export function createJobMatcher(): JobMatcherPort {
  const { chat } = createChat();
  return new LlmJobMatcher(chat);
}
