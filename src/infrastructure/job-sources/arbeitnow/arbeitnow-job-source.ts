import type { IntegrationSettingsReader } from "@/application/ports/integration-settings-reader-port";
import type { JobSourcePort } from "@/application/ports/job-source-port";
import type { Job } from "@/domain/job/job";
import type { JobSearchCriteria } from "@/domain/search/search-profile";
import { applyCommonFilters, applyIntegrationSettings } from "../filters";
import { ArbeitnowClient } from "./arbeitnow-client";
import { mapArbeitnowJob } from "./arbeitnow-mapper";

export class ArbeitnowJobSource implements JobSourcePort {
  readonly type = "ARBEITNOW" as const;

  constructor(
    private readonly client = new ArbeitnowClient(),
    private readonly readSettings?: IntegrationSettingsReader,
  ) {}

  async search(criteria: JobSearchCriteria): Promise<Job[]> {
    const settings = this.readSettings ? await this.readSettings(this.type) : undefined;
    if (settings && !settings.enabled) return [];
    const found = await this.client.fetchJobs();
    const discoveredAt = new Date();
    const jobs = found
      .filter((job) => typeof job.slug === "string" && typeof job.url === "string")
      .map((job) => mapArbeitnowJob(job, discoveredAt));
    return applyIntegrationSettings(applyCommonFilters(jobs, criteria), settings);
  }
}
