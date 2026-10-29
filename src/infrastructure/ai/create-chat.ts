import { OpenAiCompatibleChat, type ChatClient, type ChatConfig } from "./chat-client";
import type { LoggerPort } from "@/application/ports/logger-port";
import { NOOP_LOGGER } from "@/application/ports/logger-port";
import { LoggedChat } from "./logged-chat";
import { OllamaNativeChat } from "./ollama-chat";

export function resolveChatConfig(provider: string): ChatConfig {
  if (provider === "ollama") {
    // Footgun guard: the daemon path silently falls back to localhost:11434,
    // which on Vercel produces an opaque ECONNREFUSED. Fail fast with the fix.
    if (process.env.VERCEL && !process.env.OLLAMA_URL) {
      throw new Error(
        "AI_PROVIDER=ollama talks to the local Ollama daemon, which does not exist on Vercel. Set AI_PROVIDER=ollama-cloud and OLLAMA_API_KEY instead.",
      );
    }
    const baseUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";
    return {
      provider: "ollama",
      baseUrl: baseUrl.replace(/\/$/, ""),
      // Cloud by default: local CPU models are 4-10x slower and produce invalid
      // JSON more often (user decision 2026-10-21; see .env.example for timings).
      // NOTE: this path goes through the LOCAL daemon — for Vercel/serverless use
      // AI_PROVIDER=ollama-cloud (hosted API, same models, needs OLLAMA_API_KEY).
      model: process.env.OLLAMA_MODEL ?? "gemma4:31b-cloud",
      jsonMode: true,
      numCtx: Number(process.env.OLLAMA_NUM_CTX ?? 8192),
    };
  }
  if (provider === "ollama-cloud") {
    const token = process.env.OLLAMA_API_KEY;
    if (!token) {
      throw new Error("AI_PROVIDER=ollama-cloud requires OLLAMA_API_KEY to be set.");
    }
    return {
      provider: "ollama-cloud",
      baseUrl: (process.env.OLLAMA_CLOUD_URL ?? "https://ollama.com").replace(/\/$/, ""),
      apiKey: token,
      // Hosted API uses the plain tag (gemma4:31b); the "-cloud" suffix is only
      // for the local CLI/daemon.
      model: process.env.OLLAMA_CLOUD_MODEL ?? "gemma4:31b",
      jsonMode: true,
      numCtx: Number(process.env.OLLAMA_NUM_CTX ?? 8192),
    };
  }
  if (provider === "groq") {
    const token = process.env.GROQ_API_KEY;
    if (!token) {
      throw new Error("AI_PROVIDER=groq requires GROQ_API_KEY to be set.");
    }
    return {
      provider: "groq",
      baseUrl: (process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/$/, ""),
      apiKey: token,
      model: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
    };
  }
  if (provider === "huggingface") {
    const token = process.env.HF_TOKEN;
    if (!token) {
      throw new Error("AI_PROVIDER=huggingface requires HF_TOKEN to be set.");
    }
    return {
      provider: "huggingface",
      baseUrl: (process.env.HF_BASE_URL ?? "https://router.huggingface.co/v1").replace(/\/$/, ""),
      apiKey: token,
      model: process.env.HF_MODEL ?? "Qwen/Qwen2.5-7B-Instruct",
    };
  }
  throw new Error(
    `Unknown AI_PROVIDER "${provider}". Use "ollama", "ollama-cloud", "groq" or "huggingface".`,
  );
}

export interface ChatAndConfig {
  chat: ChatClient;
  config: ChatConfig;
}

export function createChat(
  provider = process.env.AI_PROVIDER ?? "ollama",
  logger: LoggerPort = NOOP_LOGGER,
): ChatAndConfig {
  const resolved = provider.toLowerCase();
  const config = resolveChatConfig(resolved);
  const client =
    resolved === "ollama" || resolved === "ollama-cloud"
      ? new OllamaNativeChat(config)
      : new OpenAiCompatibleChat(config);
  // Wrap once, here: a single chokepoint logs every LLM call uniformly across
  // providers via the Logger port (Sentry Logs), instead of console.*.
  return { chat: new LoggedChat(client, logger), config };
}
