export const JOB_SOURCE_TYPES = [
  "ADZUNA",
  "JOOBLE",
  "COMPANY_CAREER",
  "FIXTURE",
  "REMOTIVE",
  "ARBEITNOW",
  "OTHER",
] as const;

export type JobSourceType = (typeof JOB_SOURCE_TYPES)[number];

export const REMOTE_TYPES = ["ONSITE", "REMOTE", "HYBRID"] as const;

export type RemoteType = (typeof REMOTE_TYPES)[number];

export const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "FREELANCE",
  "INTERNSHIP",
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const SENIORITIES = ["JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL"] as const;

export type Seniority = (typeof SENIORITIES)[number];
