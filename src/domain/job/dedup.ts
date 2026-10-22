import type { Job } from "@/domain/job/job";
import { slugify, tokenize } from "@/domain/shared/text";

export const DEFAULT_DESCRIPTION_SIMILARITY_THRESHOLD = 0.3;

const TRACKING_PARAMS = new Set(["ref", "gclid", "fbclid", "mc_cid", "mc_eid", "igshid", "cmpid"]);

export function canonicalizeUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return rawUrl.trim().toLowerCase();
  }

  url.hash = "";
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");

  const paramsToDelete: string[] = [];
  for (const key of url.searchParams.keys()) {
    const lower = key.toLowerCase();
    if (TRACKING_PARAMS.has(lower) || lower.startsWith("utm_")) {
      paramsToDelete.push(key);
    }
  }
  for (const key of paramsToDelete) {
    url.searchParams.delete(key);
  }
  url.searchParams.sort();

  url.pathname = url.pathname.replace(/\/+$/, "") || "/";

  return url.toString();
}

export function jobContentKey(job: Pick<Job, "title" | "company" | "location">): string {
  const location = job.location;
  const locationSlug = location
    ? slugify([location.city, location.region, location.country].filter(Boolean).join(" ")) ||
      (location.isRemote ? "remote" : "unknown")
    : "unknown";

  return [slugify(job.company.name), slugify(job.title), locationSlug].join("|");
}

export function jaccardSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));

  if (tokensA.size === 0 && tokensB.size === 0) {
    return 1;
  }
  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection += 1;
    }
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

export interface DuplicateOptions {
  descriptionThreshold?: number;
}

export function isDuplicate(a: Job, b: Job, options: DuplicateOptions = {}): boolean {
  if (a.id === b.id) {
    return true;
  }

  if (a.source === b.source && a.externalId !== undefined && a.externalId === b.externalId) {
    return true;
  }

  if (canonicalizeUrl(a.url) === canonicalizeUrl(b.url)) {
    return true;
  }

  if (jobContentKey(a) !== jobContentKey(b)) {
    return false;
  }

  const descriptionA = a.description.trim();
  const descriptionB = b.description.trim();
  if (descriptionA === "" || descriptionB === "") {
    return true;
  }

  const threshold = options.descriptionThreshold ?? DEFAULT_DESCRIPTION_SIMILARITY_THRESHOLD;
  return jaccardSimilarity(descriptionA, descriptionB) >= threshold;
}
