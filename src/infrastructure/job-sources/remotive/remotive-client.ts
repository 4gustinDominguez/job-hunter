import { JobSourceError } from "../job-source-error";

export interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string | null;
  description: string;
}

interface RemotiveResponse {
  jobs?: unknown;
}

const BASE_URL = "https://remotive.com/api/remote-jobs";
const TIMEOUT_MS = 15_000;

/**
 * Remotive terms (https://remotive.com/api-documentation): link back to the
 * job URL and mention Remotive as source (the UI SourceBadge links to the
 * listing); max ~4 fetches/day advised; >2/min gets blocked; listings delayed
 * 24h. No API key.
 */
export class RemotiveClient {
  async fetchJobs(search?: string): Promise<RemotiveJob[]> {
    const params = new URLSearchParams({ category: "software-dev", limit: "50" });
    if (search !== undefined && search !== "") {
      params.set("search", search);
    }

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}?${params.toString()}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new JobSourceError(
        "REMOTIVE",
        `Remotive request failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    if (response.status === 429) {
      throw new JobSourceError(
        "REMOTIVE",
        "Rate limited by Remotive (429). Their API advises max ~4 fetches per day — try again later.",
      );
    }
    if (!response.ok) {
      throw new JobSourceError("REMOTIVE", `Remotive responded ${response.status}.`);
    }

    const payload = (await response.json().catch(() => null)) as RemotiveResponse | null;
    if (!payload || !Array.isArray(payload.jobs)) {
      throw new JobSourceError("REMOTIVE", "Unexpected Remotive payload shape.");
    }
    return payload.jobs as RemotiveJob[];
  }
}
