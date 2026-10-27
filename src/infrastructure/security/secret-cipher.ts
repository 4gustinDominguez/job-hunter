import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { SecretCipherPort } from "@/application/ports/secret-cipher-port";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

/**
 * AES-256-GCM for API keys stored on integration_settings: the DB dump never
 * exposes plaintext, and the authenticated tag makes tampering/corrupt rows
 * fail loudly instead of silently feeding garbage to a provider client.
 * Payload: `v1.<iv>.<tag>.<ciphertext>` (base64url).
 */
export class AesGcmSecretCipher implements SecretCipherPort {
  private readonly key: Buffer;

  constructor(key: Buffer) {
    if (key.length !== 32) {
      throw new Error("SETTINGS_SECRET must decode to 32 bytes (openssl rand -base64 32).");
    }
    this.key = key;
  }

  static fromBase64(secret: string): AesGcmSecretCipher {
    return new AesGcmSecretCipher(Buffer.from(secret, "base64"));
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      VERSION,
      iv.toString("base64url"),
      tag.toString("base64url"),
      encrypted.toString("base64url"),
    ].join(".");
  }

  decrypt(payload: string): string {
    const [version, iv, tag, data] = payload.split(".");
    if (version !== VERSION || !iv || !tag || !data) {
      throw new Error("Unsupported secret payload format.");
    }
    try {
      const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(iv, "base64url"));
      decipher.setAuthTag(Buffer.from(tag, "base64url"));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(data, "base64url")),
        decipher.final(),
      ]);
      return decrypted.toString("utf8");
    } catch {
      throw new Error(
        "Could not decrypt the stored secret: SETTINGS_SECRET changed or the value is corrupted.",
      );
    }
  }
}

/** Undefined when SETTINGS_SECRET is not configured (key storage unavailable). */
export function cipherFromEnv(
  env: Record<string, string | undefined> = process.env,
): AesGcmSecretCipher | undefined {
  const secret = env.SETTINGS_SECRET?.trim();
  if (secret === undefined || secret === "") return undefined;
  return AesGcmSecretCipher.fromBase64(secret);
}
