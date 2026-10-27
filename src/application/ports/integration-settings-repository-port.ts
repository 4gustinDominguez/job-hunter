import type { JobSourceType } from "@/domain/job/enums";

/** Row as stored (API key still encrypted). */
export interface StoredIntegrationSettings {
  provider: JobSourceType;
  enabled: boolean;
  apiKeyCiphertext?: string;
  apiKeyHint?: string;
  countries: string[];
  keywords: string[];
  maxItems?: number;
}

export interface IntegrationSettingsWrite {
  provider: JobSourceType;
  enabled: boolean;
  apiKeyCiphertext?: string | null;
  apiKeyHint?: string | null;
  countries: string[];
  keywords: string[];
  maxItems?: number | null;
}

export interface IntegrationSettingsRepositoryPort {
  list(): Promise<StoredIntegrationSettings[]>;
  get(provider: JobSourceType): Promise<StoredIntegrationSettings | undefined>;
  upsert(settings: IntegrationSettingsWrite): Promise<void>;
}
