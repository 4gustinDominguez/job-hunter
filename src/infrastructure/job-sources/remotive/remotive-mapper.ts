import type { EmploymentType } from "@/domain/job/enums";
import type { Job } from "@/domain/job/job";
import { parseJobLocation } from "@/domain/shared/country";
import { slugify } from "@/domain/shared/text";
import { stripHtml } from "../strip-html";
import type { RemotiveJob } from "./remotive-client";

const EMPLOYMENT_TYPES: Record<string, EmploymentType> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACT",
  freelance: "FREELANCE",
  internship: "INTERNSHIP",
};

export function mapRemotiveJob(api: RemotiveJob, discoveredAt = new Date()): Job {
  const employmentType = EMPLOYMENT_TYPES[api.job_type?.trim().toLowerCase() ?? ""];

  return {
    id: `remotive-${api.id}`,
    source: "REMOTIVE",
    externalId: `remotive-${api.id}`,
    url: api.url,
    title: api.title,
    company: { id: slugify(api.company_name), name: api.company_name },
    // Remote jobs carry a free-text scope ("Germany", "Europe, USA, UK…",
    // "Worldwide") — parseJobLocation keeps what it can recognize and stores
    // the rest verbatim as region so the display and dedupe keys stay intact.
    location: parseJobLocation(api.candidate_required_location, true),
    remoteType: "REMOTE",
    description: stripHtml(api.description ?? ""),
    employmentType,
    publishedAt: parsePublicationDate(api.publication_date),
    discoveredAt,
    skills: api.tags?.length ? api.tags.map((tag) => tag.trim()).filter(Boolean) : undefined,
  };
}

function parsePublicationDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
