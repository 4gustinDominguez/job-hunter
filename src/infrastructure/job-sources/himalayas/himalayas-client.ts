/* oxlint-disable no-await-in-loop -- search pages must be fetched sequentially */
import { JobSourceError } from "../job-source-error";

export interface HimalayasJob {
  title: string;
  excerpt?: string;
  companyName: string;
  companySlug?: string;
  employmentType?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  salaryPeriod?: string | null;
  seniority?: string[];
  currency?: string | null;
  locationRestrictions?: string[];
  timezoneRestrictions?: number[];
  categories?: string[];
  parentCategories?: string[];
  description?: string;
  pubDate?: number | string;
  expiryDate?: number | string;
  applicationLink?: string;
  guid: string;
}

interface HimalayasSearchResponse {
  jobs?: unknown;
  totalCount?: number;
}

export interface HimalayasFetchOptions {
  query?: string;
  apiKey?: string;
  maxItems?: number;
}

const BASE_URL = "https://himalayas.app/jobs/api/search";
const TIMEOUT_MS = 15_000;
const PAGE_SIZE = 20;
const DEFAULT_MAX_PAGES = 3;
const MAX_PAGES_CAP = 10;

/**
 * Himalayas: free keyless JSON API (docs: himalayas.app/api), remote-only board
 * with the richest structured fields of the candidates (location restrictions,
 * salary, seniority). The public quota is shared across all keyless callers —
 * we stay conservative (≤3 pages/run) and send a free API key when the user
 * stored one on /integrations (60 req/min, 10k/day).
 */
export class HimalayasClient {
  async fetchJobs(options: HimalayasFetchOptions = {}): Promise<HimalayasJob[]> {
    const maxPages =
      options.maxItems !== undefined && options.maxItems > 0
        ? Math.min(MAX_PAGES_CAP, Math.max(1, Math.ceil(options.maxItems / PAGE_SIZE)))
        : DEFAULT_MAX_PAGES;
    const jobs: HimalayasJob[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const batch = await this.fetchPage(page, options);
      jobs.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      if (
        options.maxItems !== undefined &&
        options.maxItems > 0 &&
        jobs.length >= options.maxItems
      ) {
        break;
      }
    }
    return jobs;
  }

  private async fetchPage(page: number, options: HimalayasFetchOptions): Promise<HimalayasJob[]> {
    const params = new URLSearchParams({
      sort: "recent",
      seniority: "Senior,Mid-level",
      page: String(page),
    });
    if (options.query !== undefined && options.query !== "") params.set("q", options.query);
    const headers: Record<string, string> = { accept: "application/json" };
    if (options.apiKey !== undefined && options.apiKey !== "") {
      headers.authorization = `Bearer ${options.apiKey}`;
    }

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}?${params.toString()}`, {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new JobSourceError(
        "HIMALAYAS",
        `Himalayas request failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    if (response.status === 429) {
      throw new JobSourceError(
        "HIMALAYAS",
        "Rate limited by Himalayas (429). The keyless quota is shared — add a free API key on /integrations (himalayas.app/signup/developer) and retry.",
      );
    }
    if (!response.ok) {
      throw new JobSourceError("HIMALAYAS", `Himalayas responded ${response.status}.`);
    }

    const payload = (await response.json().catch(() => null)) as HimalayasSearchResponse | null;
    if (!payload || !Array.isArray(payload.jobs)) {
      throw new JobSourceError("HIMALAYAS", "Unexpected Himalayas payload shape.");
    }
    return payload.jobs as HimalayasJob[];
  }
}
