import { describe, expect, it } from "vitest";
import { createIntegrationSettingsReader } from "@/application/settings/create-integration-settings-reader";
import type { SourceSettings } from "@/application/ports/integration-settings-reader-port";
import { AesGcmSecretCipher } from "@/infrastructure/security/secret-cipher";
import { InMemoryIntegrationSettingsRepository } from "../../support/in-memory/in-memory-integration-settings-repository";

const cipher = new AesGcmSecretCipher(Buffer.alloc(32, 5));
const fallback = (provider: string): SourceSettings => ({
  enabled: provider === "REMOTIVE",
  countries: [],
  keywords: [],
  maxItems: undefined,
});

describe("createIntegrationSettingsReader", () => {
  it("falls back to env-derived defaults when no row exists", async () => {
    const reader = createIntegrationSettingsReader(
      new InMemoryIntegrationSettingsRepository(),
      cipher,
      fallback as never,
    );

    await expect(reader("REMOTIVE")).resolves.toMatchObject({ enabled: true });
    await expect(reader("ARBEITNOW")).resolves.toMatchObject({ enabled: false });
  });

  it("lets a stored row win over the fallback, decrypting the key", async () => {
    const repo = new InMemoryIntegrationSettingsRepository();
    await repo.upsert({
      provider: "HIMALAYAS",
      enabled: true,
      apiKeyCiphertext: cipher.encrypt("hk-live-0000"),
      apiKeyHint: "••••0000",
      countries: ["Spain", "Europe"],
      keywords: ["python"],
      maxItems: 40,
    });
    const reader = createIntegrationSettingsReader(repo, cipher, fallback as never);

    await expect(reader("HIMALAYAS")).resolves.toEqual({
      enabled: true,
      apiKey: "hk-live-0000",
      countries: ["Spain", "Europe"],
      keywords: ["python"],
      maxItems: 40,
    });
  });

  it("degrades to no key when the cipher is missing instead of throwing", async () => {
    const repo = new InMemoryIntegrationSettingsRepository();
    await repo.upsert({
      provider: "HIMALAYAS",
      enabled: true,
      apiKeyCiphertext: cipher.encrypt("hk-live-0000"),
      apiKeyHint: "••••0000",
      countries: [],
      keywords: [],
      maxItems: null,
    });
    const reader = createIntegrationSettingsReader(repo, undefined, fallback as never);

    await expect(reader("HIMALAYAS")).resolves.toMatchObject({ enabled: true, apiKey: undefined });
  });

  it("degrades to no key when the payload was encrypted with another secret", async () => {
    const repo = new InMemoryIntegrationSettingsRepository();
    await repo.upsert({
      provider: "HIMALAYAS",
      enabled: true,
      apiKeyCiphertext: new AesGcmSecretCipher(Buffer.alloc(32, 1)).encrypt("hk-live-0000"),
      apiKeyHint: "••••0000",
      countries: [],
      keywords: [],
      maxItems: null,
    });
    const reader = createIntegrationSettingsReader(repo, cipher, fallback as never);

    await expect(reader("HIMALAYAS")).resolves.toMatchObject({ apiKey: undefined });
  });
});

describe("createIntegrationSettingsReader env key backup", () => {
  it("uses the fallback api key when the row has none stored", async () => {
    const repo = new InMemoryIntegrationSettingsRepository();
    await repo.upsert({
      provider: "HIMALAYAS",
      enabled: true,
      countries: ["Spain"],
      keywords: [],
      maxItems: null,
    });
    const reader = createIntegrationSettingsReader(repo, cipher, (provider) => ({
      ...fallback(provider),
      apiKey: provider === "HIMALAYAS" ? "hk-from-env" : undefined,
    }));

    await expect(reader("HIMALAYAS")).resolves.toMatchObject({
      apiKey: "hk-from-env",
      countries: ["Spain"],
    });
  });

  it("keeps the env key when the stored payload no longer decrypts", async () => {
    const repo = new InMemoryIntegrationSettingsRepository();
    await repo.upsert({
      provider: "HIMALAYAS",
      enabled: true,
      apiKeyCiphertext: new AesGcmSecretCipher(Buffer.alloc(32, 1)).encrypt("stale"),
      apiKeyHint: "••••tale",
      countries: [],
      keywords: [],
      maxItems: null,
    });
    const reader = createIntegrationSettingsReader(repo, cipher, (provider) => ({
      ...fallback(provider),
      apiKey: provider === "HIMALAYAS" ? "hk-from-env" : undefined,
    }));

    await expect(reader("HIMALAYAS")).resolves.toMatchObject({ apiKey: "hk-from-env" });
  });
});
