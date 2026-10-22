import type { Job } from "@/domain/job/job";
import type { JobSearchCriteria } from "@/domain/search/search-profile";
import { normalizeText } from "@/domain/shared/text";

/**
 * Light client-side criteria filtering shared by real-source adapters (the API
 * handles the keyword search where supported; this catches what APIs cannot:
 * exclusions, remote preference and location preference).
 */
export function applyCommonFilters(jobs: Job[], criteria: JobSearchCriteria): Job[] {
  return jobs.filter((job) => {
    const haystack = normalizeText(`${job.title} ${job.description}`);
    const company = normalizeText(job.company.name);

    if (
      criteria.excludedCompanies !== undefined &&
      criteria.excludedCompanies.some((name) => normalizeText(name) === company)
    ) {
      return false;
    }
    if (
      criteria.excludedKeywords !== undefined &&
      criteria.excludedKeywords.some((keyword) => haystack.includes(normalizeText(keyword)))
    ) {
      return false;
    }
    if (
      criteria.keywords.length > 0 &&
      !criteria.keywords.some((keyword) => haystack.includes(normalizeText(keyword)))
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
    return true;
  });
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
