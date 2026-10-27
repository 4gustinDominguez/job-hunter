import { beforeEach, describe, expect, it } from "vitest";
import { SaveIntegrationSettings } from "@/application/settings/save-integration-settings";
import { ValidationError } from "@/application/errors";
import { AesGcmSecretCipher } from "@/infrastructure/security/secret-cipher";
import { InMemoryIntegrationSettingsRepository } from "../../support/in-memory/in-memory-integration-settings-repository";

const cipher = new AesGcmSecretCipher(Buffer.alloc(32, 3));

describe("SaveIntegrationSettings", () => {
  let repo: InMemoryIntegrationSettingsRepository;

  beforeEach(() => {
    repo = new InMemoryIntegrationSettingsRepository();
  });

  function saver(withCipher = true) {
    return new SaveIntegrationSettings(repo, withCipher ? cipher : undefined);
  }

  it("stores the API key encrypted with a display hint", async () => {
    await saver().run({
      provider: "HIMALAYAS",
      enabled: true,
      countries: ["Spain"],
      keywords: ["react"],
      apiKey: "hk-live-9999",
    });

    const stored = await repo.get("HIMALAYAS");
    expect(stored?.apiKeyCiphertext).toBeTruthy();
    expect(stored?.apiKeyCiphertext).not.toContain("hk-live");
    expect(stored?.apiKeyHint).toBe("••••9999");
    expect(stored?.countries).toEqual(["Spain"]);
    expect(stored?.keywords).toEqual(["react"]);
  });

  it("leaves the stored key untouched when the field comes back empty", async () => {
    await saver().run({
      provider: "HIMALAYAS",
      enabled: true,
      countries: [],
      keywords: [],
      apiKey: "first-key-1111",
    });
    await saver().run({
      provider: "HIMALAYAS",
      enabled: false,
      countries: [],
      keywords: [],
      apiKey: undefined,
    });

    const stored = await repo.get("HIMALAYAS");
    expect(stored?.enabled).toBe(false);
    expect(cipher.decrypt(stored?.apiKeyCiphertext as string)).toBe("first-key-1111");
  });

  it("clears the stored key on an explicit clear", async () => {
    await saver().run({
      provider: "HIMALAYAS",
      enabled: true,
      countries: [],
      keywords: [],
      apiKey: "first-key-1111",
    });
    await saver().run({
      provider: "HIMALAYAS",
      enabled: true,
      countries: [],
      keywords: [],
      apiKey: "",
    });

    const stored = await repo.get("HIMALAYAS");
    expect(stored?.apiKeyCiphertext).toBeUndefined();
    expect(stored?.apiKeyHint).toBeUndefined();
  });

  it("rejects storing a key when SETTINGS_SECRET is missing", async () => {
    await expect(
      saver(false).run({
        provider: "HIMALAYAS",
        enabled: true,
        countries: [],
        keywords: [],
        apiKey: "hk-live-9999",
      }),
    ).rejects.toThrow(ValidationError);
    expect(await repo.get("HIMALAYAS")).toBeUndefined();
  });

  it("upserts instead of duplicating rows", async () => {
    await saver().run({ provider: "REMOTIVE", enabled: true, countries: [], keywords: [] });
    await saver().run({
      provider: "REMOTIVE",
      enabled: false,
      countries: ["France"],
      keywords: [],
    });

    expect(await repo.list()).toHaveLength(1);
    expect(await repo.get("REMOTIVE")).toMatchObject({
      enabled: false,
      countries: ["France"],
    });
  });
});
