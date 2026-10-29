import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ingestRunMock = vi.fn();
const prefilterRunMock = vi.fn();
const analyzeRunMock = vi.fn();
const recordRunMock = vi.fn();
const beginCheckInMock = vi.fn();
const finishCheckInMock = vi.fn();
vi.mock("@/app/_lib/container", () => ({
  ingestJobs: { run: ingestRunMock },
  prefilterJobs: { run: prefilterRunMock },
  analyzePendingJobs: { run: analyzeRunMock },
}));
vi.mock("@/app/_lib/ingestion-run", () => ({
  recordIngestionRun: recordRunMock,
}));
vi.mock("@/app/_lib/sentry-cron", () => ({
  beginCronCheckIn: beginCheckInMock,
  finishCronCheckIn: finishCheckInMock,
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
    recordRunMock.mockReset().mockResolvedValue(undefined);
    beginCheckInMock.mockReset().mockReturnValue("check-in-123");
    finishCheckInMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET(new Request("http://localhost/api/cron/fetch-jobs"));

    expect(response.status).toBe(401);
    expect(ingestRunMock).not.toHaveBeenCalled();
    expect(recordRunMock).not.toHaveBeenCalled();
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
    expect(recordRunMock).not.toHaveBeenCalled();
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

  it("records the run with counts, trigger=cron and aggregated errors", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    ingestRunMock.mockResolvedValue({
      fetched: 3,
      created: 2,
      attached: 1,
      skipped: 0,
      errors: [{ source: "REMOTIVE", message: "rate limited" }],
    });
    prefilterRunMock.mockResolvedValue({ checked: 5, pending: 4, skipped: 1, hasProfile: true });
    analyzeRunMock.mockResolvedValue({
      analyzed: 4,
      failed: 1,
      strong: 1,
      potential: 1,
      weak: 1,
      none: 1,
      errors: [{ jobId: "j1", title: "Dev", message: "model timeout" }],
    });

    await GET(
      new Request("http://localhost/api/cron/fetch-jobs", {
        headers: { authorization: "Bearer s3cret" },
      }),
    );

    expect(recordRunMock).toHaveBeenCalledTimes(1);
    const run = recordRunMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(run.trigger).toBe("cron");
    expect(run.startedAt).toBeInstanceOf(Date);
    expect(run.fetched).toBe(3);
    expect(run.created).toBe(2);
    expect(run.attached).toBe(1);
    expect(run.prefilterPending).toBe(4);
    expect(run.prefilterSkipped).toBe(1);
    expect(run.analysisAnalyzed).toBe(4);
    expect(run.analysisFailed).toBe(1);
    expect(run.errors).toEqual(["REMOTIVE: rate limited", "Dev: model timeout"]);
  });

  it("closes the cron check-in as ok on a successful run", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");

    await GET(
      new Request("http://localhost/api/cron/fetch-jobs", {
        headers: { authorization: "Bearer s3cret" },
      }),
    );

    expect(beginCheckInMock).toHaveBeenCalledTimes(1);
    expect(finishCheckInMock).toHaveBeenCalledTimes(1);
    const [checkInId, ok] = finishCheckInMock.mock.calls[0] as [string, boolean];
    expect(checkInId).toBe("check-in-123");
    expect(ok).toBe(true);
  });

  it("reports an error check-in and rethrows when the chain throws", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    ingestRunMock.mockRejectedValue(new Error("db down"));

    await expect(
      GET(
        new Request("http://localhost/api/cron/fetch-jobs", {
          headers: { authorization: "Bearer s3cret" },
        }),
      ),
    ).rejects.toThrow("db down");

    const [checkInId, ok] = finishCheckInMock.mock.calls[0] as [string, boolean];
    expect(checkInId).toBe("check-in-123");
    expect(ok).toBe(false);
  });
});
