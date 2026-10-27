import type { IntegrationSettingsReader } from "@/application/ports/integration-settings-reader-port";
import type { JobSourcePort } from "@/application/ports/job-source-port";
import type { Job } from "@/domain/job/job";
import type { JobSearchCriteria } from "@/domain/search/search-profile";
import { applyCommonFilters, applyIntegrationSettings } from "../filters";
import { RemotiveClient } from "./remotive-client";
import { mapRemotiveJob } from "./remotive-mapper";

export class RemotiveJobSource implements JobSourcePort {
  readonly type = "REMOTIVE" as const;

  constructor(
    private readonly client = new RemotiveClient(),
    private readonly readSettings?: IntegrationSettingsReader,
  ) {}

  async search(criteria: JobSearchCriteria): Promise<Job[]> {
    const settings = this.readSettings ? await this.readSettings(this.type) : undefined;
    if (settings && !settings.enabled) return [];

    // The API search query: profile keywords win, provider keywords from
    // /integrations act as the fallback (their API accepts a single query).
    const criteriaQuery = criteria.keywords.join(" ").trim();
    const settingsQuery = settings?.keywords.join(" ").trim() ?? "";
    const query =
      criteriaQuery !== "" ? criteriaQuery : settingsQuery !== "" ? settingsQuery : undefined;
    const found = await this.client.fetchJobs(query);
    const discoveredAt = new Date();
    const jobs = found
      .filter((job) => typeof job.id === "number" && typeof job.url === "string")
      .map((job) => mapRemotiveJob(job, discoveredAt));
    return applyIntegrationSettings(applyCommonFilters(jobs, criteria), settings);
  }
}
