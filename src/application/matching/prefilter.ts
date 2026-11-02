import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import type { Job } from "@/domain/job/job";
import { countryFromName, PLACE_SEPARATOR, REGION_SCOPE_PATTERN } from "@/domain/shared/country";
import { normalizeText } from "@/domain/shared/text";

export interface PrefilterDecision {
  pass: boolean;
  reason: string;
}

// ── Fake-remote detection ────────────────────────────────────────────────
// Offers labelled REMOTE but actually bound to a region — the known case is
// North America (US/Canada "remote only"). Extend this set as more "not really
// full remote" patterns surface (iterating).
const RESTRICTED_REMOTE_COUNTRIES: ReadonlySet<string> = new Set(
  ["United States", "Canada"].map(normalizeText),
);

/**
 * True when a structured region scope is North-America-only, e.g.
 * "USA, Canada, USA timezones". A regional scope word (Europe, EMEA, APAC…)
 * or any country outside the restricted set means it is NOT restricted.
 */
function isRestrictedRegionScope(region: string): boolean {
  const segments = region
    .split(PLACE_SEPARATOR)
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "");
  if (segments.length === 0) return false;
  if (segments.some((segment) => REGION_SCOPE_PATTERN.test(segment))) return false;
  const countries = segments
    .map((segment) => countryFromName(segment))
    .filter((country): country is string => country !== undefined);
  if (countries.length === 0) return false;
  return countries.every((country) => RESTRICTED_REMOTE_COUNTRIES.has(normalizeText(country)));
}

// Description fallback: the offer claims worldwide (no structured scope) but
// the prose narrows it to North America. English-only heuristic by design —
// extend as more phrasings surface.
const RESTRICTED_REMOTE_PATTERNS: ReadonlyArray<{ re: RegExp; region: string }> = [
  { re: /\b(?:us|usa|u\.s\.|united states)\s+only\b/i, region: "United States" },
  { re: /\bin (?:the )?(?:us|usa|u\.s\.|united states) only\b/i, region: "United States" },
  { re: /\bwithin (?:the )?(?:us|usa|u\.s\.|united states)\b/i, region: "United States" },
  { re: /\b(?:us|usa|u\.s\.|united states)[\s-]based\b/i, region: "United States" },
  { re: /\bbased in (?:the )?(?:us|usa|u\.s\.|united states)\b/i, region: "United States" },
  {
    re: /\bauthori[sz]ed to work in (?:the )?(?:us|usa|u\.s\.|united states)\b/i,
    region: "United States",
  },
  {
    re: /\b(?:must|required to) (?:live|reside|be located) in (?:the )?(?:us|usa|u\.s\.|united states)\b/i,
    region: "United States",
  },
  { re: /\bus (?:person|citizen)\b/i, region: "United States" },
  { re: /\bcanada\s+only\b/i, region: "Canada" },
  { re: /\bbased in canada\b/i, region: "Canada" },
  { re: /\b(?:must|required to) (?:live|reside) in canada\b/i, region: "Canada" },
];

/**
 * The region a REMOTE offer is actually bound to when it is NOT full remote —
 * the "says remote, but only US/Canada" fake-remote case. Returns undefined for
 * genuinely worldwide (or non-North-American) remote.
 *
 * The structured scope wins when present: a country/region in `location` is the
 * authoritative requirement. Only when the offer claims NO scope (worldwide) is
 * the description consulted — that is where a "worldwide" field can hide a
 * "US only" prose constraint.
 */
export function remoteRestriction(job: Job): string | undefined {
  if (job.remoteType !== "REMOTE") return undefined;
  const { country, region } = job.location ?? {};
  if (country !== undefined) {
    return RESTRICTED_REMOTE_COUNTRIES.has(normalizeText(country)) ? country : undefined;
  }
  if (region !== undefined) {
    return isRestrictedRegionScope(region) ? "North America" : undefined;
  }
  for (const { re, region: restricted } of RESTRICTED_REMOTE_PATTERNS) {
    if (re.test(job.description)) return restricted;
  }
  return undefined;
}

/**
 * Cheap local gate that decides which offers deserve an LLM analysis call.
 * Bias is deliberately toward PASS: a false PASS costs one LLM call, a false
 * SKIP loses an offer — so it only discards the obviously irrelevant.
 */
export function prefilterJob(job: Job, profile: CandidateProfile): PrefilterDecision {
  const preferences = profile.preferences;

  if (
    preferences.excludedCompanies.some(
      (name) => normalizeText(name) === normalizeText(job.company.name),
    )
  ) {
    return { pass: false, reason: "excluded company" };
  }

  // The profile's REMOTE preference means remote work it can actually do.
  // Skip on-site/hybrid (clearly not remote) and "fake remote" — offers
  // labelled REMOTE but bound to a region (currently North America). A job with
  // no remoteType stays unknown → falls through (bias toward PASS).
  if (preferences.remotePreference === "REMOTE" && job.remoteType !== undefined) {
    if (job.remoteType === "ONSITE") {
      return { pass: false, reason: "profile requires remote, job is on-site" };
    }
    if (job.remoteType === "HYBRID") {
      return { pass: false, reason: "profile requires remote, job is hybrid" };
    }
    const restriction = remoteRestriction(job);
    if (restriction !== undefined) {
      return { pass: false, reason: `remote restricted to ${restriction}` };
    }
  }

  if (
    preferences.salaryExpectation !== undefined &&
    job.salary?.maximum !== undefined &&
    job.salary.maximum < preferences.salaryExpectation.minimum
  ) {
    return { pass: false, reason: "salary range below expectation" };
  }

  const haystack = normalizeText(`${job.title} ${job.description}`);
  const titleHit = preferences.desiredRoles.some((role) => {
    const wanted = normalizeText(role);
    return wanted !== "" && haystack.includes(wanted);
  });
  const skillHit = profile.skills.some((skill) => {
    const name = normalizeText(skill.name);
    return name !== "" && haystack.includes(name);
  });

  if (!titleHit && !skillHit) {
    return { pass: false, reason: "no desired-role or skill overlap" };
  }

  return {
    pass: true,
    reason:
      titleHit && skillHit ? "role + skill overlap" : titleHit ? "role overlap" : "skill overlap",
  };
}
