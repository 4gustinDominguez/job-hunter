import type { IntegrationSettingsReader } from "@/application/ports/integration-settings-reader-port";
import type { JobSourcePort } from "@/application/ports/job-source-port";
import type { Job } from "@/domain/job/job";
import type { JobSearchCriteria } from "@/domain/search/search-profile";
import { normalizeText } from "@/domain/shared/text";
import { applyIntegrationSettings } from "../filters";
import { FIXTURE_JOBS } from "./fixture-jobs";

export class FixtureJobSource implements JobSourcePort {
  readonly type = "FIXTURE" as const;

  constructor(private readonly readSettings?: IntegrationSettingsReader) {}

  async search(criteria: JobSearchCriteria): Promise<Job[]> {
    const settings = this.readSettings ? await this.readSettings(this.type) : undefined;
    if (settings && !settings.enabled) return [];
    const results: Job[] = [];
    for (const job of FIXTURE_JOBS) {
      if (matches(job, criteria)) {
        results.push({ ...job, discoveredAt: new Date() });
      }
    }
    return applyIntegrationSettings(results, settings);
  }
}
function matches(job: Job, criteria: JobSearchCriteria): boolean {
  const haystack = normalizeText(`${job.title} ${job.description}`);
  const company = normalizeText(job.company.name);

  if (
    criteria.keywords.length > 0 &&
    !criteria.keywords.some((k) => haystack.includes(normalizeText(k)))
  ) {
    return false;
  }
  if (
    criteria.locations !== undefined &&
    criteria.locations.length > 0 &&
    !matchesLocation(job, criteria.locations)
  ) {
    return false;
  }
  if (criteria.remotePreference !== undefined && criteria.remotePreference !== "ANY") {
    if (job.remoteType !== criteria.remotePreference) return false;
  }
  if (criteria.employmentTypes !== undefined && criteria.employmentTypes.length > 0) {
    if (
      job.employmentType === undefined ||
      !criteria.employmentTypes.includes(job.employmentType)
    ) {
      return false;
    }
  }
  if (criteria.salaryMinimum !== undefined) {
    if (job.salary?.minimum === undefined || job.salary.minimum < criteria.salaryMinimum) {
      return false;
    }
  }
  if (
    criteria.excludedCompanies !== undefined &&
    criteria.excludedCompanies.some((name) => normalizeText(name) === company)
  ) {
    return false;
  }
  if (
    criteria.excludedKeywords !== undefined &&
    criteria.excludedKeywords.some((k) => haystack.includes(normalizeText(k)))
  ) {
    return false;
  }
  return true;
}

function matchesLocation(job: Job, locations: string[]): boolean {
  const isRemoteJob = job.remoteType === "REMOTE" || job.location?.isRemote === true;
  const jobParts = [job.location?.city, job.location?.region, job.location?.country]
    .filter((part): part is string => part !== undefined)
    .map((part) => normalizeText(part));

  return locations.some((location) => {
    const wanted = normalizeText(location);
    if (wanted === "remote") return isRemoteJob;
    return jobParts.some((part) => part.includes(wanted));
  });
}
