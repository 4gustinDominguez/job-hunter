import type { JobSourceType } from "@/domain/job/enums";

/** Runtime view of a provider's settings as consumed by job sources. */
export interface SourceSettings {
  enabled: boolean;
  apiKey?: string;
  countries: string[];
  keywords: string[];
  maxItems?: number;
}

/**
 * Returns the effective settings for a provider (stored row wins, undefined
 * when nothing was ever configured). Sources call this inside `search()` so
 * changes on /integrations apply on the next run without a redeploy.
 */
export type IntegrationSettingsReader = (
  provider: JobSourceType,
) => Promise<SourceSettings | undefined>;
