/* oxlint-disable no-await-in-loop -- arbeitnow pages must be fetched sequentially */
import { JobSourceError } from "../job-source-error";

export interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;
}

interface ArbeitnowResponse {
  data?: unknown;
  links?: { next?: string | null };
}

const BASE_URL = "https://www.arbeitnow.com/api/job-board-api";
const TIMEOUT_MS = 15_000;
const MAX_PAGES = 2;

/**
 * Arbeitnow: keyless, paginated. Europe/Germany-heavy. Soft limits — the API
 * sits behind Cloudflare and 429s on bursts; we stay conservative (a couple of
 * pages per run, manual or daily cron).
 */
export class ArbeitnowClient {
  async fetchJobs(maxPages = MAX_PAGES): Promise<ArbeitnowJob[]> {
    const jobs: ArbeitnowJob[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const { data, hasNext } = await this.fetchPage(page);
      jobs.push(...data);
      if (!hasNext) break;
    }
    return jobs;
  }

  private async fetchPage(page: number): Promise<{ data: ArbeitnowJob[]; hasNext: boolean }> {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}?page=${page}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new JobSourceError(
        "ARBEITNOW",
        `Arbeitnow request failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    if (response.status === 429) {
      throw new JobSourceError(
        "ARBEITNOW",
        "Rate limited by Arbeitnow (429). Try again later — their API dislikes bursts.",
      );
    }
    if (!response.ok) {
      throw new JobSourceError("ARBEITNOW", `Arbeitnow responded ${response.status}.`);
    }

    const payload = (await response.json().catch(() => null)) as ArbeitnowResponse | null;
    if (!payload || !Array.isArray(payload.data)) {
      throw new JobSourceError("ARBEITNOW", "Unexpected Arbeitnow payload shape.");
    }
    return {
      data: payload.data as ArbeitnowJob[],
      hasNext: typeof payload.links?.next === "string" && payload.links.next !== "",
    };
  }
}
