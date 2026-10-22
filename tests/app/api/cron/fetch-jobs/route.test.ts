import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ingestRunMock = vi.fn();
const prefilterRunMock = vi.fn();
const analyzeRunMock = vi.fn();
vi.mock("@/app/_lib/container", () => ({
  ingestJobs: { run: ingestRunMock },
  prefilterJobs: { run: prefilterRunMock },
  analyzePendingJobs: { run: analyzeRunMock },
}));

const { GET } = await import("@/app/api/cron/fetch-jobs/route");

describe("cron fetch-jobs route", () => {
  beforeEach(() => {
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
});
