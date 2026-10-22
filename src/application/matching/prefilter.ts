import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import type { Job } from "@/domain/job/job";
import { normalizeText } from "@/domain/shared/text";

export interface PrefilterDecision {
  pass: boolean;
  reason: string;
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

  if (preferences.remotePreference === "REMOTE" && job.remoteType === "ONSITE") {
    return { pass: false, reason: "profile requires remote, job is on-site" };
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
