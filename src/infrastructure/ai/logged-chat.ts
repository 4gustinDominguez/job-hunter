import type { ChatClient, ChatCompleteOptions, ChatResult, ChatTurn } from "./chat-client";
import type { LoggerPort } from "@/application/ports/logger-port";

/**
 * Single chokepoint that logs every LLM interaction, identically for all
 * providers (ollama, ollama-cloud, groq, huggingface) and all consumers (CV
 * extraction, fit analysis, document generation). One decorator means one place
 * to read or change what gets logged — no duplicated log calls in each client.
 *
 * Emits through the `LoggerPort` (Sentry Logs today), not `console.*`, so the
 * backend is swappable and the app logs deliberately at the composition root.
 *
 * **No PII, by contract**: only metadata (provider, model, latency, truncation).
 * Never the prompt turns or the response content — those carry CV text, job
 * descriptions and profile data.
 *
 * Token counts (`ChatResult.usage`) are intentionally NOT logged yet — kept on
 * the result so they're available if tests later need them.
 */
export class LoggedChat implements ChatClient {
  constructor(
    private readonly inner: ChatClient,
    private readonly logger: LoggerPort,
  ) {}

  get provider(): string {
    return this.inner.provider;
  }

  get model(): string {
    return this.inner.model;
  }

  async complete(turns: ChatTurn[], options?: ChatCompleteOptions): Promise<ChatResult> {
    const startedAt = Date.now();
    const promptChars = turns.reduce((total, turn) => total + turn.content.length, 0);
    try {
      const result = await this.inner.complete(turns, options);
      this.logger.info("llm call", {
        provider: this.provider,
        model: this.model,
        durationMs: Date.now() - startedAt,
        turns: turns.length,
        promptChars,
        truncated: result.truncated,
      });
      return result;
    } catch (error) {
      this.logger.error("llm call failed", {
        provider: this.provider,
        model: this.model,
        durationMs: Date.now() - startedAt,
        turns: turns.length,
        promptChars,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
