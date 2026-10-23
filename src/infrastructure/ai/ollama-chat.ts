import type {
  ChatClient,
  ChatCompleteOptions,
  ChatConfig,
  ChatResult,
  ChatTurn,
} from "./chat-client";
import { ChatTimeoutError, toNetworkError } from "./chat-client";

const DEFAULT_TIMEOUT_MS = 180_000;

interface OllamaChatResponse {
  message?: { content?: unknown };
  done_reason?: unknown;
  error?: unknown;
}

/**
 * Ollama's native /api/chat endpoint. Its OpenAI-compatible /v1 route silently
 * ignores `options` (so num_ctx stays at the runtime default 4096 and long
 * outputs get truncated); the native route honors num_ctx + format:"json".
 */
export class OllamaNativeChat implements ChatClient {
  constructor(private readonly config: ChatConfig) {}

  get provider(): string {
    return this.config.provider;
  }

  get model(): string {
    return this.config.model;
  }

  async complete(turns: ChatTurn[], options: ChatCompleteOptions = {}): Promise<ChatResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: turns,
        stream: false,
        ...(this.config.jsonMode ? { format: "json" } : {}),
        options: {
          temperature: 0.2,
          num_predict: options.maxTokens ?? 4096,
          ...(this.config.numCtx ? { num_ctx: this.config.numCtx } : {}),
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    }).catch((error: unknown) => {
      if (error instanceof Error && /timeout/i.test(error.message)) {
        throw new ChatTimeoutError(Math.round(timeoutMs / 1000));
      }
      throw toNetworkError(error, this.config.baseUrl);
    });

    const payload = (await response.json().catch(() => ({}))) as OllamaChatResponse;
    if (!response.ok) {
      const detail = typeof payload.error === "string" ? payload.error : "";
      throw new Error(
        `provider responded ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      );
    }
    if (typeof payload.error === "string" && payload.error !== "") {
      throw new Error(`provider error: ${payload.error.slice(0, 200)}`);
    }
    const content = payload.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      throw new Error("provider returned an empty response");
    }
    return { content, truncated: payload.done_reason === "length" };
  }
}
