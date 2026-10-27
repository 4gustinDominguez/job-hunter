import type { JobSearchCriteria, JobSearchProfile } from "@/domain/search/search-profile";

/** Search profile → fetch criteria. Shared by the fetch action and the cron. */
export function criteriaFromProfile(profile: JobSearchProfile): JobSearchCriteria {
  return {
    keywords: profile.keywords,
    locations: profile.locations.length > 0 ? profile.locations : undefined,
    remotePreference: profile.remotePreference,
    employmentTypes: profile.employmentTypes,
    seniority: profile.seniority,
    salaryMinimum: profile.salary?.minimum,
    salaryCurrency: profile.salary?.currency,
    excludedCompanies: profile.excludedCompanies,
    excludedKeywords: profile.excludedKeywords,
  };
}
