import { describe, expect, it } from "vitest";
import { AesGcmSecretCipher, cipherFromEnv } from "@/infrastructure/security/secret-cipher";

const KEY = Buffer.alloc(32, 7);

describe("AesGcmSecretCipher", () => {
  const cipher = new AesGcmSecretCipher(KEY);

  it("round-trips a plaintext secret", () => {
    const payload = cipher.encrypt("sk-live-super-secret-1234");

    expect(cipher.decrypt(payload)).toBe("sk-live-super-secret-1234");
  });

  it("never leaks the plaintext into the payload and is non-deterministic", () => {
    const payload = cipher.encrypt("sk-live-super-secret-1234");

    expect(payload).not.toContain("sk-live");
    expect(payload).not.toContain("super");
    expect(cipher.encrypt("sk-live-super-secret-1234")).not.toBe(payload);
    expect(payload.startsWith("v1.")).toBe(true);
  });

  it("fails loudly when decrypted with a different key", () => {
    const payload = cipher.encrypt("value");
    const other = new AesGcmSecretCipher(Buffer.alloc(32, 9));

    expect(() => other.decrypt(payload)).toThrow(/Could not decrypt/);
  });

  it("fails loudly when the payload was tampered with", () => {
    const payload = cipher.encrypt("value");
    const [version, iv, tag, data] = payload.split(".");
    const tamperedData = data === undefined ? "" : data.replace(/.(?=.)/, "A");

    expect(() => cipher.decrypt([version, iv, tag, tamperedData].join("."))).toThrow(
      /Could not decrypt/,
    );
  });

  it("rejects malformed payloads", () => {
    expect(() => cipher.decrypt("not-a-payload")).toThrow(/Unsupported secret payload/);
  });

  it("rejects keys that are not 32 bytes", () => {
    expect(() => new AesGcmSecretCipher(Buffer.alloc(16))).toThrow(/32 bytes/);
    expect(() => AesGcmSecretCipher.fromBase64(Buffer.alloc(16).toString("base64"))).toThrow(
      /32 bytes/,
    );
  });
});

describe("cipherFromEnv", () => {
  it("returns undefined when the secret is missing or blank", () => {
    expect(cipherFromEnv({})).toBeUndefined();
    expect(cipherFromEnv({ SETTINGS_SECRET: "  " })).toBeUndefined();
  });

  it("builds a working cipher from a base64 secret", () => {
    const cipher = cipherFromEnv({ SETTINGS_SECRET: KEY.toString("base64") });

    expect(cipher).toBeInstanceOf(AesGcmSecretCipher);
    expect(cipher?.decrypt(cipher.encrypt("abc"))).toBe("abc");
  });
});
