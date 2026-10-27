import type {
  IntegrationSettingsRepositoryPort,
  IntegrationSettingsWrite,
  StoredIntegrationSettings,
} from "@/application/ports/integration-settings-repository-port";
import type { JobSourceType } from "@/domain/job/enums";

export class InMemoryIntegrationSettingsRepository implements IntegrationSettingsRepositoryPort {
  private readonly rows = new Map<JobSourceType, StoredIntegrationSettings>();

  constructor(initial: StoredIntegrationSettings[] = []) {
    for (const row of initial) this.rows.set(row.provider, row);
  }

  async list(): Promise<StoredIntegrationSettings[]> {
    return [...this.rows.values()];
  }

  async get(provider: JobSourceType): Promise<StoredIntegrationSettings | undefined> {
    return this.rows.get(provider);
  }

  async upsert(settings: IntegrationSettingsWrite): Promise<void> {
    this.rows.set(settings.provider, {
      provider: settings.provider,
      enabled: settings.enabled,
      apiKeyCiphertext: settings.apiKeyCiphertext ?? undefined,
      apiKeyHint: settings.apiKeyHint ?? undefined,
      countries: [...settings.countries],
      keywords: [...settings.keywords],
      maxItems: settings.maxItems ?? undefined,
    });
  }
}
