/** Filter params understood by the /jobs list — the only ones worth carrying around. */
const JOBS_FILTER_KEYS = [
  "q",
  "location",
  "remote",
  "type",
  "source",
  "fit",
  "state",
  "sort",
  "dismissed",
  "page",
] as const;

type FilterParams = Record<string, string | string[] | undefined>;

function buildQuery(params: FilterParams): URLSearchParams {
  const query = new URLSearchParams();
  for (const key of JOBS_FILTER_KEYS) {
    const value = params[key];
    if (value === undefined) continue;
    const joined = (Array.isArray(value) ? value : [value]).filter(Boolean).join(",");
    if (joined) query.set(key, joined);
  }
  return query;
}

/** Canonical `/jobs` href for the given filters (used by the "← All jobs" breadcrumb). */
export function jobsListHref(params: FilterParams): `/jobs?${string}` | "/jobs" {
  const query = buildQuery(params).toString();
  return query === "" ? "/jobs" : `/jobs?${query}`;
}

/**
 * Link to a single job carrying the list's filters, so the detail page can
 * restore them when navigating back.
 */
export function jobHref(
  jobId: string,
  params: FilterParams,
): `/jobs/${string}` | `/jobs/${string}?${string}` {
  const query = buildQuery(params).toString();
  return query === "" ? `/jobs/${jobId}` : `/jobs/${jobId}?${query}`;
}
