import type { IntegrationSettingsReader } from "@/application/ports/integration-settings-reader-port";
import type { JobSourcePort } from "@/application/ports/job-source-port";
import type { Job } from "@/domain/job/job";
import type { JobSearchCriteria } from "@/domain/search/search-profile";
import { applyCommonFilters, applyIntegrationSettings } from "../filters";
import { WwrClient, type WwrItem } from "./wwr-client";
import { mapWwrJob } from "./wwr-mapper";

/**
 * Strict category gate (user decision 2026-10-27): only engineering-ish feed
 * categories survive; Sales, Design, Support, Product, Management etc. never
 * reach the DB even before the shared title gate runs.
 */
const ALLOWED_CATEGORIES =
  /(programming|devops|sysadmin|database|data|analytics|qa|security|engineering)/i;

function isSoftwareCategory(item: WwrItem): boolean {
  const category = item.category ?? "";
  return category !== "" && ALLOWED_CATEGORIES.test(category);
}

export class WwrJobSource implements JobSourcePort {
  readonly type = "WWR" as const;

  constructor(
    private readonly client = new WwrClient(),
    private readonly readSettings?: IntegrationSettingsReader,
  ) {}

  async search(criteria: JobSearchCriteria): Promise<Job[]> {
    const settings = this.readSettings ? await this.readSettings(this.type) : undefined;
    if (settings && !settings.enabled) return [];

    const found = await this.client.fetchJobs({ maxItems: settings?.maxItems });
    const discoveredAt = new Date();
    const jobs = found.filter(isSoftwareCategory).map((item) => mapWwrJob(item, discoveredAt));
    return applyIntegrationSettings(applyCommonFilters(jobs, criteria), settings);
  }
}
