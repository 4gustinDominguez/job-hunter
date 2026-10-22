import { OpenAiCompatibleChat, type ChatClient, type ChatConfig } from "./chat-client";
import { OllamaNativeChat } from "./ollama-chat";

export function resolveChatConfig(provider: string): ChatConfig {
  if (provider === "ollama") {
    const baseUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";
    return {
      provider: "ollama",
      baseUrl: baseUrl.replace(/\/$/, ""),
      // Cloud by default: local CPU models are 4-10x slower and produce invalid
      // JSON more often (user decision 2026-10-21; see .env.example for timings).
      model: process.env.OLLAMA_MODEL ?? "gemma4:31b-cloud",
      jsonMode: true,
      numCtx: Number(process.env.OLLAMA_NUM_CTX ?? 8192),
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
  throw new Error(`Unknown AI_PROVIDER "${provider}". Use "ollama" or "huggingface".`);
}

export interface ChatAndConfig {
  chat: ChatClient;
  config: ChatConfig;
}

export function createChat(provider = process.env.AI_PROVIDER ?? "ollama"): ChatAndConfig {
  const resolved = provider.toLowerCase();
  const config = resolveChatConfig(resolved);
  const chat =
    resolved === "ollama" ? new OllamaNativeChat(config) : new OpenAiCompatibleChat(config);
  return { chat, config };
}
