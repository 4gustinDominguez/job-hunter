import type { IntegrationSettingsRepositoryPort } from "@/application/ports/integration-settings-repository-port";
import type {
  IntegrationSettingsReader,
  SourceSettings,
} from "@/application/ports/integration-settings-reader-port";
import type { SecretCipherPort } from "@/application/ports/secret-cipher-port";
import type { JobSourceType } from "@/domain/job/enums";

/**
 * Effective settings per provider: the stored row wins; a missing row falls
 * back to the env-derived default (JOB_SOURCES etc.) so behaviour is unchanged
 * before anyone opens /integrations. Decryption failures degrade to "no key"
 * with a warning — a missing SETTINGS_SECRET must not take down the whole cron.
 */
export function createIntegrationSettingsReader(
  settings: IntegrationSettingsRepositoryPort,
  cipher: SecretCipherPort | undefined,
  fallback: (provider: JobSourceType) => SourceSettings,
): IntegrationSettingsReader {
  return async (provider: JobSourceType): Promise<SourceSettings> => {
    const stored = await settings.get(provider);
    if (!stored) return fallback(provider);

    let apiKey: string | undefined;
    if (stored.apiKeyCiphertext) {
      if (!cipher) {
        console.warn(
          `[settings] ${provider} has a stored API key but SETTINGS_SECRET is not set — running without it.`,
        );
      } else {
        try {
          apiKey = cipher.decrypt(stored.apiKeyCiphertext);
        } catch (error) {
          console.warn(
            `[settings] ${provider} stored API key could not be decrypted: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    return {
      enabled: stored.enabled,
      apiKey,
      countries: stored.countries,
      keywords: stored.keywords,
      maxItems: stored.maxItems ?? undefined,
    };
  };
}
