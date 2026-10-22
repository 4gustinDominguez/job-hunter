import type { EmploymentType } from "@/domain/job/enums";
import type { Job } from "@/domain/job/job";
import { slugify } from "@/domain/shared/text";
import { stripHtml } from "../strip-html";
import type { ArbeitnowJob } from "./arbeitnow-client";

export function mapArbeitnowJob(api: ArbeitnowJob, discoveredAt = new Date()): Job {
  return {
    id: `arbeitnow-${api.slug}`,
    source: "ARBEITNOW",
    externalId: `arbeitnow-${api.slug}`,
    url: api.url,
    title: api.title,
    company: { id: slugify(api.company_name), name: api.company_name },
    location: {
      city: api.location?.trim() || undefined,
      isRemote: api.remote === true,
    },
    remoteType: api.remote === true ? "REMOTE" : "ONSITE",
    description: stripHtml(api.description ?? ""),
    employmentType: mapEmploymentType(api.job_types),
    publishedAt: parseCreatedAt(api.created_at),
    discoveredAt,
    skills: api.tags?.length ? api.tags.map((tag) => tag.trim()).filter(Boolean) : undefined,
  };
}

/**
 * Arbeitnow `job_types` are free-form German labels ("Unbefristeter
 * arbeitsvertrag", "vollzeit", "berufseinstieg"…), not enums — map only the
 * clearly classifiable ones and leave the rest undefined.
 */
function mapEmploymentType(jobTypes: string[] | undefined): EmploymentType | undefined {
  const joined = (jobTypes ?? []).join(" ").toLowerCase();
  if (joined.includes("vollzeit") || joined.includes("full")) return "FULL_TIME";
  if (joined.includes("teilzeit") || joined.includes("part")) return "PART_TIME";
  if (joined.includes("freelance") || joined.includes("selbstständig")) return "FREELANCE";
  if (joined.includes("praktikum") || joined.includes("internship")) return "INTERNSHIP";
  return undefined;
}

function parseCreatedAt(value: number | undefined): Date | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return new Date(value * 1000);
}
