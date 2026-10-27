import { describe, expect, it, vi } from "vitest";
import { recordIngestionRun } from "@/application/ingestion/record-ingestion-run";
import { InMemoryIngestionRunRepository } from "../../support/in-memory/in-memory-ingestion-run-repository";

describe("recordIngestionRun", () => {
  it("records start → run → finish with the summary counts", async () => {
    const repo = new InMemoryIngestionRunRepository();

    await recordIngestionRun(repo, "cron", async () => ({
      fetched: 120,
      created: 40,
      attached: 2,
      skipped: 78,
      prefilterQueued: 9,
      prefilterSkipped: 111,
      analyzed: 8,
      strong: 1,
      potential: 2,
      weak: 3,
      none: 2,
      failed: 0,
      errors: [],
    }));

    const run = await repo.latest();
    expect(run).toMatchObject({
      kind: "cron",
      fetched: 120,
      created: 40,
      prefilterQueued: 9,
      analyzed: 8,
      failed: 0,
    });
    expect(run?.finishedAt).toBeInstanceOf(Date);
    expect(run?.errors).toEqual([]);
  });

  it("still finishes the row with an exception error when the run throws", async () => {
    const repo = new InMemoryIngestionRunRepository();

    await expect(
      recordIngestionRun(repo, "manual", async () => {
        throw new Error("boom: remotive down");
      }),
    ).rejects.toThrow("boom: remotive down");

    const run = await repo.latest();
    expect(run?.finishedAt).toBeInstanceOf(Date);
    expect(run?.fetched).toBe(0);
    expect(run?.errors).toEqual([{ stage: "exception", message: "boom: remotive down" }]);
  });

  it("propagates a start failure without recording anything", async () => {
    const repo = new InMemoryIngestionRunRepository();
    vi.spyOn(repo, "start").mockRejectedValue(new Error("db down"));

    await expect(
      recordIngestionRun(repo, "cron", async () => ({
        fetched: 0,
        created: 0,
        attached: 0,
        skipped: 0,
      })),
    ).rejects.toThrow("db down");
    expect(await repo.latest()).toBeNull();
  });
});
