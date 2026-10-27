import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ingestRunMock = vi.fn();
const prefilterRunMock = vi.fn();
const analyzeRunMock = vi.fn();
const searchProfilesListMock = vi.fn();
vi.mock("@/app/_lib/container", () => ({
  ingestJobs: { run: ingestRunMock },
  prefilterJobs: { run: prefilterRunMock },
  analyzePendingJobs: { run: analyzeRunMock },
  searchProfileRepository: { list: searchProfilesListMock },
}));

const { GET } = await import("@/app/api/cron/fetch-jobs/route");

describe("cron fetch-jobs route", () => {
  beforeEach(() => {
    searchProfilesListMock.mockReset().mockResolvedValue([]);
    ingestRunMock
      .mockReset()
      .mockResolvedValue({ fetched: 0, created: 0, attached: 0, skipped: 0, errors: [] });
    prefilterRunMock
      .mockReset()
      .mockResolvedValue({ checked: 0, pending: 0, skipped: 0, hasProfile: true });
    analyzeRunMock.mockReset().mockResolvedValue({
      analyzed: 0,
      failed: 0,
      strong: 0,
      potential: 0,
      weak: 0,
      none: 0,
      errors: [],
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET(new Request("http://localhost/api/cron/fetch-jobs"));

    expect(response.status).toBe(401);
    expect(ingestRunMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer token does not match", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");

    const response = await GET(
      new Request("http://localhost/api/cron/fetch-jobs", {
        headers: { authorization: "Bearer wrong" },
      }),
    );

    expect(response.status).toBe(401);
    expect(ingestRunMock).not.toHaveBeenCalled();
  });

  it("chains fetch → prefilter → analyze for a valid token", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");

    const response = await GET(
      new Request("http://localhost/api/cron/fetch-jobs", {
        headers: { authorization: "Bearer s3cret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(ingestRunMock).toHaveBeenCalledWith({ keywords: [] });
    expect(prefilterRunMock).toHaveBeenCalledTimes(1);
    expect(analyzeRunMock).toHaveBeenCalledTimes(1);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("ingest");
    expect(body).toHaveProperty("prefilter");
    expect(body).toHaveProperty("analysis");
  });

  it("fetches with the oldest search profile as the standing criteria", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    searchProfilesListMock.mockResolvedValue([
      {
        id: "sp-1",
        name: "EU React",
        keywords: ["react"],
        locations: ["Madrid"],
        remotePreference: "REMOTE",
        employmentTypes: ["FULL_TIME"],
        seniority: ["SENIOR"],
        salary: { minimum: 60000, currency: "EUR" },
        excludedCompanies: ["Acme"],
        excludedKeywords: ["crypto"],
      },
      {
        id: "sp-2",
        name: "Ignored newer profile",
        keywords: ["go"],
        locations: [],
      },
    ]);

    await GET(
      new Request("http://localhost/api/cron/fetch-jobs", {
        headers: { authorization: "Bearer s3cret" },
      }),
    );

    expect(ingestRunMock).toHaveBeenCalledWith({
      keywords: ["react"],
      locations: ["Madrid"],
      remotePreference: "REMOTE",
      employmentTypes: ["FULL_TIME"],
      seniority: ["SENIOR"],
      salaryMinimum: 60000,
      salaryCurrency: "EUR",
      excludedCompanies: ["Acme"],
      excludedKeywords: ["crypto"],
    });
  });
});
