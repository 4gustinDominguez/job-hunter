import { describe, expect, it, vi } from "vitest";
import type { ChatClient, ChatResult, ChatTurn } from "@/infrastructure/ai/chat-client";
import { LoggedChat } from "@/infrastructure/ai/logged-chat";
import type { LogContext, LoggerPort } from "@/application/ports/logger-port";

/** Captures every call so assertions inspect what would reach Sentry Logs. */
function makeLogger(): LoggerPort & {
  calls: Array<{ level: string; message: string; context?: LogContext }>;
} {
  const calls: Array<{ level: string; message: string; context?: LogContext }> = [];
  return {
    calls,
    info: (message, context) => calls.push({ level: "info", message, context }),
    warn: (message, context) => calls.push({ level: "warn", message, context }),
    error: (message, context) => calls.push({ level: "error", message, context }),
  };
}

function makeInner(result: ChatResult): ChatClient {
  return {
    provider: "ollama",
    model: "gemma4:31b",
    complete: vi.fn().mockResolvedValue(result),
  };
}

const TURNS: ChatTurn[] = [
  { role: "system", content: "sys" },
  { role: "user", content: "hello world" },
];

describe("LoggedChat", () => {
  it("returns the inner result unchanged and exposes provider/model", async () => {
    const chat = new LoggedChat(makeInner({ content: "ok", truncated: false }), makeLogger());

    const result = await chat.complete(TURNS);

    expect(result).toEqual({ content: "ok", truncated: false });
    expect(chat.provider).toBe("ollama");
    expect(chat.model).toBe("gemma4:31b");
  });

  it("logs one info line with provider, model, latency, turn/char counts and truncation", async () => {
    const logger = makeLogger();
    const chat = new LoggedChat(makeInner({ content: "ok", truncated: true }), logger);

    await chat.complete(TURNS);

    expect(logger.calls).toHaveLength(1);
    const [entry] = logger.calls;
    expect(entry?.level).toBe("info");
    expect(entry?.context).toMatchObject({
      provider: "ollama",
      model: "gemma4:31b",
      turns: 2,
      promptChars: 14, // "sys" + "hello world"
      truncated: true,
    });
    expect(typeof entry?.context?.durationMs).toBe("number");
  });

  it("logs an error entry and rethrows when the inner client fails", async () => {
    const logger = makeLogger();
    const failing: ChatClient = {
      provider: "ollama",
      model: "gemma4:31b",
      complete: vi.fn().mockRejectedValue(new Error("provider responded 500")),
    };
    const chat = new LoggedChat(failing, logger);

    await expect(chat.complete(TURNS)).rejects.toThrow("provider responded 500");

    expect(logger.calls).toHaveLength(1);
    expect(logger.calls[0]?.level).toBe("error");
    expect(logger.calls[0]?.context).toMatchObject({
      provider: "ollama",
      model: "gemma4:31b",
      error: "provider responded 500",
    });
  });

  it("never logs prompt or response content (no-PII contract)", async () => {
    const logger = makeLogger();
    const chat = new LoggedChat(
      makeInner({ content: "SECRET-RESPONSE", truncated: false }),
      logger,
    );

    await chat.complete([{ role: "user", content: "SECRET-PROMPT" }]);

    const serialized = JSON.stringify(logger.calls);
    expect(serialized).not.toContain("SECRET-PROMPT");
    expect(serialized).not.toContain("SECRET-RESPONSE");
  });

  it("does not log token counts yet (ChatUsage stays on the result only)", async () => {
    const logger = makeLogger();
    const chat = new LoggedChat(
      makeInner({
        content: "ok",
        truncated: false,
        usage: { promptTokens: 10, completionTokens: 5 },
      }),
      logger,
    );

    const result = await chat.complete(TURNS);

    // Available on the result for tests that later need it…
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 5 });
    // …but not emitted to the log.
    expect(JSON.stringify(logger.calls)).not.toContain("promptTokens");
    expect(JSON.stringify(logger.calls)).not.toContain("completionTokens");
  });
});
