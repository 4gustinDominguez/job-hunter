import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveChatConfig } from "@/infrastructure/ai/create-chat";

describe("resolveChatConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds the groq config from env (production provider)", () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test");
    vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-20b");

    const config = resolveChatConfig("groq");

    expect(config).toMatchObject({
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: "gsk_test",
      model: "openai/gpt-oss-20b",
    });
  });

  it("requires GROQ_API_KEY", () => {
    vi.stubEnv("GROQ_API_KEY", "");

    expect(() => resolveChatConfig("groq")).toThrow(/GROQ_API_KEY/);
  });

  it("builds the ollama-cloud config (hosted API, production)", () => {
    vi.stubEnv("OLLAMA_API_KEY", "ok_test");

    const config = resolveChatConfig("ollama-cloud");

    expect(config).toMatchObject({
      provider: "ollama-cloud",
      baseUrl: "https://ollama.com",
      apiKey: "ok_test",
      model: "gemma4:31b",
      jsonMode: true,
    });
  });

  it("requires OLLAMA_API_KEY", () => {
    vi.stubEnv("OLLAMA_API_KEY", "");

    expect(() => resolveChatConfig("ollama-cloud")).toThrow(/OLLAMA_API_KEY/);
  });

  it("lists ollama-cloud among valid providers on unknown input", () => {
    expect(() => resolveChatConfig("nope")).toThrow(/ollama-cloud/);
  });
});
