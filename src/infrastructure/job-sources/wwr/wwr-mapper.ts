import type { EmploymentType } from "@/domain/job/enums";
import type { Job } from "@/domain/job/job";
import { countryFromName, parseJobLocation } from "@/domain/shared/country";
import type { Location } from "@/domain/shared/location";
import { slugify } from "@/domain/shared/text";
import { stripHtml } from "../strip-html";
import type { WwrItem } from "./wwr-client";

const EMPLOYMENT_TYPES: Record<string, EmploymentType> = {
  "full-time": "FULL_TIME",
  "full time": "FULL_TIME",
  "part-time": "PART_TIME",
  "part time": "PART_TIME",
  contract: "CONTRACT",
  freelance: "FREELANCE",
  internship: "INTERNSHIP",
};

// Flags and emoji decorating country names in the `country` field.
const EMOJI_PATTERN = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}]/gu;
const VARIATION_SELECTOR_PATTERN = /\uFE0F/gu;

const MAX_LISTED_COUNTRIES = 10;

export function mapWwrJob(item: WwrItem, discoveredAt = new Date()): Job {
  const rawTitle = (item.title ?? "").trim();
  const separator = rawTitle.indexOf(": ");
  const company = separator > 0 ? rawTitle.slice(0, separator).trim() : "Unknown";
  const title = separator > 0 ? rawTitle.slice(separator + 2).trim() : rawTitle;
  const externalId = `wwr-${slugify(item.guid ?? item.link ?? rawTitle)}`;

  return {
    id: externalId,
    source: "WWR",
    externalId,
    url: item.link ?? item.guid ?? "",
    title,
    company: { id: slugify(company), name: company },
    location: wwrLocation(item),
    remoteType: "REMOTE",
    description: stripHtml(item.description ?? ""),
    employmentType: EMPLOYMENT_TYPES[(item.type ?? "").trim().toLowerCase()],
    publishedAt: parseDate(item.pubDate),
    discoveredAt,
    skills: parseSkills(item.skills),
  };
}

/**
 * `country` (emoji-decorated, often a comma list) wins over `region`
 * ("Anywhere in the World", sometimes a city like "Helsinki").
 */
function wwrLocation(item: WwrItem): Location {
  const countryField = item.country?.trim();
  if (countryField !== undefined && countryField !== "") {
    const fromList = locationFromCountryList(countryField);
    if (fromList) return fromList;
  }
  const region = item.region?.trim();
  return parseJobLocation(region === "" || region === undefined ? undefined : region, true);
}

function locationFromCountryList(raw: string): Location | undefined {
  const segments = raw
    .replace(EMOJI_PATTERN, " ")
    .replace(VARIATION_SELECTOR_PATTERN, " ")
    .split(",")
    .map((segment) =>
      segment
        .replace(/^\s*and\s+/i, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((segment) => segment !== "");
  const countries = segments
    .map((segment) => countryFromName(segment))
    .filter((country): country is string => country !== undefined);
  if (countries.length === 0) return undefined;
  if (countries.length > MAX_LISTED_COUNTRIES) return { isRemote: true };
  if (countries.length === 1) return { country: countries[0], isRemote: true };
  return { region: countries.join(", "), isRemote: true };
}

function parseSkills(raw: string | undefined): string[] | undefined {
  if (raw === undefined || raw.trim() === "") return undefined;
  const skills = raw
    .split(",")
    .map((skill) => skill.replace(/^\s*and\s+/i, "").trim())
    .filter((skill) => skill !== "");
  return skills.length > 0 ? skills : undefined;
}

function parseDate(value: string | undefined): Date | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
