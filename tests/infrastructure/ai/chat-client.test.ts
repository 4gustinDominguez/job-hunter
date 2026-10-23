import { describe, expect, it, vi } from "vitest";
import { toNetworkError, OpenAiCompatibleChat } from "@/infrastructure/ai/chat-client";
import { OllamaNativeChat } from "@/infrastructure/ai/ollama-chat";

function undiciStyleFailure(): Error {
  const cause = new Error("connect ECONNREFUSED 127.0.0.1:11434");
  return new TypeError("fetch failed", { cause });
}

describe("toNetworkError", () => {
  it("keeps the cause chain visible (fetch failed → ECONNREFUSED)", () => {
    const error = toNetworkError(undiciStyleFailure(), "http://localhost:11434");

    expect(error.message).toBe(
      "request to http://localhost:11434 failed (fetch failed · connect ECONNREFUSED 127.0.0.1:11434)",
    );
  });

  it("falls back to String() for non-Error values", () => {
    expect(toNetworkError("boom", "https://x").message).toBe("request to https://x failed (boom)");
  });
});

describe.each([
  [
    "OpenAiCompatibleChat",
    () =>
      new OpenAiCompatibleChat({
        provider: "t",
        baseUrl: "http://ai.local:1",
        apiKey: "k",
        model: "m",
      }),
  ],
  [
    "OllamaNativeChat",
    () => new OllamaNativeChat({ provider: "t", baseUrl: "http://ai.local:1", model: "m" }),
  ],
])("%s network failures", (_name, makeClient) => {
  it("wraps fetch rejections with the target URL and cause", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(undiciStyleFailure()));

    await expect(makeClient().complete([{ role: "user", content: "hi" }])).rejects.toThrow(
      /request to http:\/\/ai\.local:1 failed \(fetch failed · connect ECONNREFUSED/,
    );

    vi.unstubAllGlobals();
  });
});
