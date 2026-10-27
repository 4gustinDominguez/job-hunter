import type { IntegrationSettingsReader } from "@/application/ports/integration-settings-reader-port";
import type { JobSourcePort } from "@/application/ports/job-source-port";
import type { Job } from "@/domain/job/job";
import type { JobSearchCriteria } from "@/domain/search/search-profile";
import { applyCommonFilters, applyIntegrationSettings } from "../filters";
import { HimalayasClient } from "./himalayas-client";
import { mapHimalayasJob } from "./himalayas-mapper";

export class HimalayasJobSource implements JobSourcePort {
  readonly type = "HIMALAYAS" as const;

  constructor(
    private readonly client = new HimalayasClient(),
    private readonly readSettings?: IntegrationSettingsReader,
  ) {}

  async search(criteria: JobSearchCriteria): Promise<Job[]> {
    const settings = this.readSettings ? await this.readSettings(this.type) : undefined;
    if (settings && !settings.enabled) return [];

    // Profile keywords win; provider keywords from /integrations act as the
    // fallback query (the API takes a single `q`).
    const criteriaQuery = criteria.keywords.join(" ").trim();
    const settingsQuery = settings?.keywords.join(" ").trim() ?? "";
    const query =
      criteriaQuery !== "" ? criteriaQuery : settingsQuery !== "" ? settingsQuery : undefined;

    const found = await this.client.fetchJobs({
      query,
      apiKey: settings?.apiKey,
      maxItems: settings?.maxItems,
    });
    const discoveredAt = new Date();
    const jobs = found
      .filter(
        (job) =>
          typeof job.guid === "string" &&
          typeof job.title === "string" &&
          typeof job.companyName === "string",
      )
      .map((job) => mapHimalayasJob(job, discoveredAt));
    return applyIntegrationSettings(applyCommonFilters(jobs, criteria), settings);
  }
}
