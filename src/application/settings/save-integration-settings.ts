import type { IntegrationSettingsRepositoryPort } from "@/application/ports/integration-settings-repository-port";
import type { SecretCipherPort } from "@/application/ports/secret-cipher-port";
import type { JobSourceType } from "@/domain/job/enums";
import { ValidationError } from "../errors";

export interface SaveIntegrationSettingsInput {
  provider: JobSourceType;
  enabled: boolean;
  countries: string[];
  keywords: string[];
  maxItems?: number;
  /** undefined = leave the stored key untouched; "" = clear it. */
  apiKey?: string;
}

/** Last four characters only — enough to recognize a key, useless to an attacker. */
export function maskSecret(value: string): string {
  const trimmed = value.trim();
  const tail = trimmed.slice(-4);
  return `••••${tail}`;
}

export class SaveIntegrationSettings {
  constructor(
    private readonly settings: IntegrationSettingsRepositoryPort,
    private readonly cipher: SecretCipherPort | undefined,
  ) {}

  async run(input: SaveIntegrationSettingsInput): Promise<void> {
    const existing = await this.settings.get(input.provider);
    let apiKeyCiphertext = existing?.apiKeyCiphertext ?? null;
    let apiKeyHint = existing?.apiKeyHint ?? null;

    if (input.apiKey !== undefined && input.apiKey !== "") {
      if (!this.cipher) {
        throw new ValidationError(
          "apiKey",
          "SETTINGS_SECRET is not set, so API keys cannot be stored. Add it (openssl rand -base64 32) to .env and to Vercel, then retry.",
        );
      }
      apiKeyCiphertext = this.cipher.encrypt(input.apiKey);
      apiKeyHint = maskSecret(input.apiKey);
    } else if (input.apiKey === "") {
      apiKeyCiphertext = null;
      apiKeyHint = null;
    }

    await this.settings.upsert({
      provider: input.provider,
      enabled: input.enabled,
      apiKeyCiphertext,
      apiKeyHint,
      countries: input.countries,
      keywords: input.keywords,
      maxItems: input.maxItems ?? null,
    });
  }
}
