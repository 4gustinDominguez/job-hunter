export const JOB_SOURCE_TYPES = [
  "ADZUNA",
  "JOOBLE",
  "COMPANY_CAREER",
  "FIXTURE",
  "REMOTIVE",
  "ARBEITNOW",
  "HIMALAYAS",
  "WWR",
  "OTHER",
] as const;

export type JobSourceType = (typeof JOB_SOURCE_TYPES)[number];

/** Sources manageable from /integrations (rows exist only for these). */
export const MANAGED_JOB_SOURCES = [
  "FIXTURE",
  "REMOTIVE",
  "ARBEITNOW",
  "HIMALAYAS",
  "WWR",
] as const;

/** Managed sources that take an API key (rendered with a key field in the UI). */
export const SOURCES_WITH_API_KEY: readonly JobSourceType[] = ["HIMALAYAS"];

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

/** Who triggered an ingestion run: the daily cron or the UI fetch button. */
export const INGESTION_RUN_KINDS = ["cron", "manual"] as const;

export type IngestionRunKind = (typeof INGESTION_RUN_KINDS)[number];
