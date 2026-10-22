import { describe, expect, it } from "vitest";
import { FixtureJobSource } from "@/infrastructure/job-sources/fixture/fixture-job-source";
import { FIXTURE_JOBS } from "@/infrastructure/job-sources/fixture/fixture-jobs";

describe("FixtureJobSource", () => {
  const source = new FixtureJobSource();
  const emptyCriteria = { keywords: [] };

  it("returns the whole fixture catalog when no criteria are given", async () => {
    const results = await source.search(emptyCriteria);

    expect(results).toHaveLength(FIXTURE_JOBS.length);
  });

  it("returns fresh copies so callers cannot mutate the fixtures", async () => {
    const [first] = await source.search(emptyCriteria);
    first.title = "MUTATED";
    const [again] = await source.search(emptyCriteria);

    expect(again.title).toBe("Senior React Developer");
    expect(again).not.toBe(first);
    expect(FIXTURE_JOBS[0].title).toBe("Senior React Developer");
  });

  it("stamps discoveredAt at search time", async () => {
    const before = Date.now();
    const [job] = await source.search(emptyCriteria);

    expect(job.discoveredAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("matches keywords against title and description (any keyword)", async () => {
    const results = await source.search({ keywords: ["react"] });

    expect(results).toHaveLength(4);
    expect(results.every((job) => /react/i.test(`${job.title} ${job.description}`))).toBe(true);
  });

  it("combines keywords with locations", async () => {
    const results = await source.search({ keywords: ["react"], locations: ["Madrid"] });

    expect(results).toHaveLength(2);
    expect(results.every((job) => job.location?.city === "Madrid")).toBe(true);
  });

  it("matches jobs by city", async () => {
    const results = await source.search({ keywords: [], locations: ["Madrid"] });

    expect(results).toHaveLength(5);
  });

  it("matches remote jobs with the 'remote' location", async () => {
    const results = await source.search({ keywords: [], locations: ["remote"] });

    expect(results).toHaveLength(3);
    expect(results.every((job) => job.remoteType === "REMOTE")).toBe(true);
  });

  it("filters by remote preference, treating ANY as no filter", async () => {
    expect(await source.search({ keywords: [], remotePreference: "REMOTE" })).toHaveLength(3);
    expect(await source.search({ keywords: [], remotePreference: "ONSITE" })).toHaveLength(4);
    expect(await source.search({ keywords: [], remotePreference: "ANY" })).toHaveLength(
      FIXTURE_JOBS.length,
    );
  });

  it("filters by employment type", async () => {
    expect(await source.search({ keywords: [], employmentTypes: ["FULL_TIME"] })).toHaveLength(
      FIXTURE_JOBS.length,
    );
    expect(await source.search({ keywords: [], employmentTypes: ["CONTRACT"] })).toHaveLength(0);
  });

  it("filters by minimum salary, dropping jobs without a known salary", async () => {
    const results = await source.search({ keywords: [], salaryMinimum: 50000 });

    expect(results).toHaveLength(3);
    expect(results.every((job) => (job.salary?.minimum ?? 0) >= 50000)).toBe(true);
  });

  it("excludes companies by exact (normalized) name", async () => {
    const results = await source.search({ keywords: [], excludedCompanies: ["ACME software"] });

    expect(results).toHaveLength(FIXTURE_JOBS.length - 3);
    expect(results.every((job) => job.company.name !== "Acme Software")).toBe(true);
  });

  it("excludes listings containing excluded keywords", async () => {
    const results = await source.search({ keywords: [], excludedKeywords: ["kubernetes"] });

    expect(results).toHaveLength(FIXTURE_JOBS.length - 3);
    expect(results.every((job) => !/kubernetes/i.test(`${job.title} ${job.description}`))).toBe(
      true,
    );
  });

  it("ignores seniority (jobs do not carry it)", async () => {
    const results = await source.search({ keywords: [], seniority: ["JUNIOR"] });

    expect(results).toHaveLength(FIXTURE_JOBS.length);
  });
});
