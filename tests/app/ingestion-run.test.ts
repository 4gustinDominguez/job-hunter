import { beforeEach, describe, expect, it, vi } from "vitest";

const saveMock = vi.fn();
vi.mock("@/app/_lib/container", () => ({
  ingestionRunRepository: { save: saveMock },
}));

const { recordIngestionRun } = await import("@/app/_lib/ingestion-run");

const RUN = {
  trigger: "cron" as const,
  startedAt: new Date("2026-10-29T09:00:00Z"),
  fetched: 10,
  created: 4,
  attached: 1,
  skipped: 5,
  prefilterPending: 3,
  prefilterSkipped: 7,
  analysisAnalyzed: 3,
  analysisFailed: 0,
  errors: [] as string[],
};

describe("recordIngestionRun", () => {
  beforeEach(() => {
    saveMock.mockReset().mockResolvedValue(undefined);
    vi.restoreAllMocks();
  });

  it("saves the run with finishedAt stamped at call time", async () => {
    const before = Date.now();

    await recordIngestionRun(RUN);

    expect(saveMock).toHaveBeenCalledTimes(1);
    const saved = saveMock.mock.calls[0]?.[0] as Record<string, unknown> & { finishedAt: Date };
    expect(saved).toMatchObject({ ...RUN });
    expect(saved.finishedAt).toBeInstanceOf(Date);
    expect(saved.finishedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("swallows a failed save (observability must never break the run) and logs it", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    saveMock.mockRejectedValue(new Error("db down"));

    await expect(recordIngestionRun(RUN)).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});
