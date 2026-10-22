export interface ChatConfig {
  /** Provider name for traceability ("ollama" | "huggingface" | …). */
  provider: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  /** Ask the provider for native JSON-mode output (Ollama supports it; some routers reject it). */
  jsonMode?: boolean;
  /** Runtime context window for Ollama (`options.num_ctx`) — its default 4096 truncates long outputs. */
  numCtx?: number;
}

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompleteOptions {
  maxTokens?: number;
  timeoutMs?: number;
}

export interface ChatResult {
  content: string;
  /** True when the model stopped because of the token limit (output cut short). */
  truncated: boolean;
}

export class ChatTimeoutError extends Error {
  constructor(public readonly seconds: number) {
    super(`AI request timed out after ${seconds}s`);
    this.name = "ChatTimeoutError";
  }
}

export interface ChatClient {
  readonly provider: string;
  readonly model: string;
  complete(turns: ChatTurn[], options?: ChatCompleteOptions): Promise<ChatResult>;
}

const DEFAULT_TIMEOUT_MS = 180_000;

export class OpenAiCompatibleChat implements ChatClient {
  constructor(private readonly config: ChatConfig) {}

  get provider(): string {
    return this.config.provider;
  }

  get model(): string {
    return this.config.model;
  }

  async complete(turns: ChatTurn[], options: ChatCompleteOptions = {}): Promise<ChatResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: turns,
        temperature: 0.2,
        max_tokens: options.maxTokens ?? 4096,
        ...(this.config.jsonMode ? { response_format: { type: "json_object" } } : {}),
        ...(this.config.numCtx ? { options: { num_ctx: this.config.numCtx } } : {}),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    }).catch((error: unknown) => {
      if (error instanceof Error && /timeout/i.test(error.message)) {
        throw new ChatTimeoutError(Math.round(timeoutMs / 1000));
      }
      throw error;
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `provider responded ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      );
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown }; finish_reason?: unknown }>;
    };
    const choice = payload.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      throw new Error("provider returned an empty response");
    }
    return { content, truncated: choice?.finish_reason === "length" };
  }
}
