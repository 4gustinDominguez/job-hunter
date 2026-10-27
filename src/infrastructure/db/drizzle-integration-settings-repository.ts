import { eq } from "drizzle-orm";
import type {
  IntegrationSettingsRepositoryPort,
  IntegrationSettingsWrite,
  StoredIntegrationSettings,
} from "@/application/ports/integration-settings-repository-port";
import type { JobSourceType } from "@/domain/job/enums";
import type { db } from "./client";
import { integrationSettings } from "./schema";

type Db = typeof db;
type Row = typeof integrationSettings.$inferSelect;

function toStored(row: Row): StoredIntegrationSettings {
  return {
    provider: row.provider,
    enabled: row.enabled,
    apiKeyCiphertext: row.apiKeyCiphertext ?? undefined,
    apiKeyHint: row.apiKeyHint ?? undefined,
    countries: row.countries,
    keywords: row.keywords,
    maxItems: row.maxItems ?? undefined,
  };
}

export class DrizzleIntegrationSettingsRepository implements IntegrationSettingsRepositoryPort {
  constructor(private readonly database: Db) {}

  async list(): Promise<StoredIntegrationSettings[]> {
    const rows = await this.database.select().from(integrationSettings);
    return rows.map(toStored);
  }

  async get(provider: JobSourceType): Promise<StoredIntegrationSettings | undefined> {
    const [row] = await this.database
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.provider, provider))
      .limit(1);
    return row ? toStored(row) : undefined;
  }

  async upsert(settings: IntegrationSettingsWrite): Promise<void> {
    await this.database
      .insert(integrationSettings)
      .values({
        provider: settings.provider,
        enabled: settings.enabled,
        apiKeyCiphertext: settings.apiKeyCiphertext ?? null,
        apiKeyHint: settings.apiKeyHint ?? null,
        countries: settings.countries,
        keywords: settings.keywords,
        maxItems: settings.maxItems ?? null,
      })
      .onConflictDoUpdate({
        target: integrationSettings.provider,
        set: {
          enabled: settings.enabled,
          apiKeyCiphertext: settings.apiKeyCiphertext ?? null,
          apiKeyHint: settings.apiKeyHint ?? null,
          countries: settings.countries,
          keywords: settings.keywords,
          maxItems: settings.maxItems ?? null,
          updatedAt: new Date(),
        },
      });
  }
}
