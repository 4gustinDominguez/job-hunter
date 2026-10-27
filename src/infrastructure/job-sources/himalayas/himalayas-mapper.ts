import type { EmploymentType } from "@/domain/job/enums";
import type { Job } from "@/domain/job/job";
import { parseJobLocation } from "@/domain/shared/country";
import type { Location } from "@/domain/shared/location";
import type { SalaryPeriod, SalaryRange } from "@/domain/shared/salary";
import { slugify } from "@/domain/shared/text";
import { stripHtml } from "../strip-html";
import type { HimalayasJob } from "./himalayas-client";

const EMPLOYMENT_TYPES: Record<string, EmploymentType> = {
  "full time": "FULL_TIME",
  "part time": "PART_TIME",
  contractor: "CONTRACT",
  temporary: "CONTRACT",
  intern: "INTERNSHIP",
};

const SALARY_PERIODS: Record<string, SalaryPeriod> = {
  hourly: "hourly",
  monthly: "monthly",
  annual: "yearly",
  yearly: "yearly",
};

// Beyond this, a restriction list is effectively worldwide (lemon.io-style
// 70+ country lists) — collapse it to the remote flag so the job card stays
// readable and the geo filter keeps it (unknown geo = keep).
const WORLDWIDE_LIST_THRESHOLD = 10;

export function mapHimalayasJob(api: HimalayasJob, discoveredAt = new Date()): Job {
  const externalId = `himalayas-${slugify(api.guid)}`;
  return {
    id: externalId,
    source: "HIMALAYAS",
    externalId,
    // Terms of use: Apply goes through the supplied applicationLink, unchanged.
    url: api.applicationLink ?? api.guid,
    title: api.title,
    company: { id: slugify(api.companySlug ?? api.companyName), name: api.companyName },
    location: mapLocation(api.locationRestrictions),
    remoteType: "REMOTE",
    description: stripHtml(api.description ?? api.excerpt ?? ""),
    employmentType: mapEmploymentType(api.employmentType),
    salary: mapSalary(api),
    publishedAt: parseTimestamp(api.pubDate),
    discoveredAt,
    // categories are slug fragments ("Senior-React-Native-Mobile-Developer"),
    // not skill names — the title/description carry the signal instead.
    skills: undefined,
  };
}

function mapLocation(restrictions: string[] | undefined): Location {
  const list = restrictions ?? [];
  if (list.length === 0 || list.length > WORLDWIDE_LIST_THRESHOLD) return { isRemote: true };
  if (list.length === 1) return parseJobLocation(list[0], true);
  return { region: list.join(", "), isRemote: true };
}

function mapEmploymentType(value: string | undefined): EmploymentType | undefined {
  if (value === undefined) return undefined;
  return EMPLOYMENT_TYPES[value.trim().toLowerCase()];
}

function mapSalary(api: HimalayasJob): SalaryRange | undefined {
  const period = api.salaryPeriod
    ? SALARY_PERIODS[api.salaryPeriod.trim().toLowerCase()]
    : undefined;
  if (period === undefined || api.currency === undefined || api.currency === null) return undefined;
  const minimum = typeof api.minSalary === "number" ? api.minSalary : undefined;
  const maximum = typeof api.maxSalary === "number" ? api.maxSalary : undefined;
  if (minimum === undefined && maximum === undefined) return undefined;
  return { minimum, maximum, currency: api.currency, period };
}

function parseTimestamp(value: number | string | undefined): Date | undefined {
  if (value === undefined) return undefined;
  const seconds = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return new Date(seconds * 1000);
}
