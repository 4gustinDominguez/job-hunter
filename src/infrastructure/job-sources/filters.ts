import type { SourceSettings } from "@/application/ports/integration-settings-reader-port";
import type { Job } from "@/domain/job/job";
import type { JobSearchCriteria } from "@/domain/search/search-profile";
import { countryFromName, EUROPEAN_COUNTRIES } from "@/domain/shared/country";
import { normalizeText } from "@/domain/shared/text";

/**
 * Strict software-role gate (user decision 2026-10-27): every source passes
 * its titles through this before anything is persisted, so the DB stays free of
 * sales/marketing/student postings that would otherwise waste an LLM analysis
 * each and pollute the board ("Head of Sales (m/w/d) AI-Startup" etc.).
 *
 * Deliberately multilingual (arbeitnow is German-heavy, remotive mixes ES/EN).
 * The title must hit a software token AND no exclusion — bias: a role is kept
 * only when it is clearly an engineering/development posting at mid level+.
 */

const SOFTWARE_TITLE_TOKENS = [
  "engineer",
  "engineering",
  "developer",
  "development",
  "programmer",
  "programming",
  "architect",
  "software",
  "entwickler",
  "ingenieur",
  "desarrollador",
  "programador",
  "developpeur",
  "devops",
  "sre",
  "full-stack",
  "fullstack",
  "full stack",
  "front-end",
  "frontend",
  "back-end",
  "backend",
  "data engineer",
  "data scientist",
  "mlops",
  "platform",
  "infrastructure",
  "cloud",
  "web developer",
  "mobile developer",
  "security engineer",
  "tester",
  "test automation",
];

// Word-boundary patterns: plain substrings would eat real roles
// ("intern" ⊂ "International", "sales" ⊂ …).
const SOFTWARE_TITLE_EXCLUSIONS = [
  /\bsales\b/i,
  /\bgtm\b/i,
  /\bmarketing\b/i,
  /\brecruiter/i,
  /\bdesigner\b/i,
  /\bcopywriter\b/i,
  /\btranslator\b/i,
  /\baccountant\b/i,
  /\blawyer\b/i,
  /\boperations\b/i,
  /\bfounder\b/i,
  /\bintern\b/i,
  /\binternship\b/i,
  /\bstudent\b/i,
  /\btrainee\b/i,
  /\bapprentice\b/i,
  /\bgraduate\b/i,
  /\bjunior\b/i,
  /\bwerkstudent\b/i,
  /\bpraktikant/i,
  /\bberater\b/i,
];

const SOFTWARE_TITLE_SUBSTRING_EXCLUSIONS = [
  "account executive",
  "account manager",
  "customer success",
  "customer service",
  "product manager",
  "project manager",
  "business development",
  "technical writer",
  "human resources",
  "video editor",
  "working student",
  "content writer",
  "talent acquisition",
  "head of sales",
];

/** True when the title reads as a mid/senior software role (strict gate). */
export function isSoftwareRole(job: Job): boolean {
  const title = normalizeText(job.title);
  if (title === "") return false;
  const hasSoftwareToken = SOFTWARE_TITLE_TOKENS.some((token) => title.includes(token));
  if (!hasSoftwareToken) return false;
  if (SOFTWARE_TITLE_EXCLUSIONS.some((pattern) => pattern.test(job.title))) return false;
  if (SOFTWARE_TITLE_SUBSTRING_EXCLUSIONS.some((token) => title.includes(token))) return false;
  return true;
}

/**
 * Light client-side criteria filtering shared by real-source adapters (the API
 * handles the keyword search where supported; this catches what APIs cannot:
 * exclusions, remote preference and location preference).
 */
export function applyCommonFilters(jobs: Job[], criteria: JobSearchCriteria): Job[] {
  return jobs.filter((job) => {
    if (!isSoftwareRole(job)) return false;
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

/**
 * Per-provider geo gate from /integrations. Rules, in order:
 * - empty selection → everything passes;
 * - a known country must be in the selection ("Europe" accepts the European set);
 * - a stored region (multi-country list, "Europe" scope) is matched per segment;
 * - no country and no region (remote or unknown place) → keep: bias against
 *   losing offers over geo data we could not infer.
 */
export function matchesAllowedCountries(job: Job, allowed: readonly string[]): boolean {
  if (allowed.length === 0) return true;
  const allowedKeys = allowed.map(normalizeText);
  const wantsEurope = allowedKeys.includes("europe");
  const location = job.location;
  if (!location) return true;

  if (location.country !== undefined && location.country !== "") {
    const key = normalizeText(location.country);
    if (allowedKeys.includes(key)) return true;
    if (wantsEurope && EUROPEAN_COUNTRIES.has(key)) return true;
    return false;
  }

  const region = location.region !== undefined ? normalizeText(location.region) : undefined;
  if (region !== undefined && region !== "") {
    // "Europe"/"EMEA" scope in the region means the job is open across Europe —
    // keep it whenever the selection includes any European country (or the
    // "Europe" pseudo-option), then try per-segment matches for the rest.
    const allowsEuropean = allowedKeys.some(
      (key) => key === "europe" || EUROPEAN_COUNTRIES.has(key),
    );
    if (allowsEuropean && /(europe|emea|european union)/.test(region)) return true;
    const segments = region
      .split(/[,;·|/–—-]+/)
      .map((segment) => segment.trim())
      .filter((segment) => segment !== "");
    for (const segment of segments) {
      const canonical = countryFromName(segment);
      const key = canonical !== undefined ? normalizeText(canonical) : segment;
      if (allowedKeys.includes(key)) return true;
    }
    return false;
  }

  return true;
}

/** Provider settings on top of the common filters: countries + per-run cap. */
export function applyIntegrationSettings(jobs: Job[], settings: SourceSettings | undefined): Job[] {
  if (!settings) return jobs;
  let result = jobs;
  if (settings.countries.length > 0) {
    result = result.filter((job) => matchesAllowedCountries(job, settings.countries));
  }
  if (settings.maxItems !== undefined && settings.maxItems > 0) {
    result = result.slice(0, settings.maxItems);
  }
  return result;
}
