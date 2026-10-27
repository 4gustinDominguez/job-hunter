import type { SourceSettings } from "@/application/ports/integration-settings-reader-port";
import { JOB_SOURCE_TYPES, type JobSourceType } from "@/domain/job/enums";

const DEFAULT_JOB_SOURCES = "remotive,arbeitnow";

/**
 * Env-derived defaults used when a provider has no settings row yet (and by
 * /integrations to render the initial state). JOB_SOURCES selects which
 * sources are on out of the box — the UI toggle then takes over per provider.
 */
export function envEnabledSources(): Set<JobSourceType> {
  const values = (process.env.JOB_SOURCES ?? DEFAULT_JOB_SOURCES)
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(
      (value): value is JobSourceType =>
        value !== "" && (JOB_SOURCE_TYPES as readonly string[]).includes(value),
    );
  return new Set(values);
}

export function envDefaultSettings(provider: JobSourceType): SourceSettings {
  return {
    enabled: envEnabledSources().has(provider),
    countries: [],
    keywords: [],
    maxItems: undefined,
  };
}
