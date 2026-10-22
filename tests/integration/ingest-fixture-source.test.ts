import { beforeEach, describe, expect, it } from "vitest";
import { IngestJobs } from "@/application/jobs/ingest-jobs";
import { FIXTURE_JOBS } from "@/infrastructure/job-sources/fixture/fixture-jobs";
import { FixtureJobSource } from "@/infrastructure/job-sources/fixture/fixture-job-source";
import { InMemoryCompanyRepository } from "../support/in-memory/in-memory-company-repository";
import { InMemoryJobRepository } from "../support/in-memory/in-memory-job-repository";

const INTENTIONAL_DUPLICATES = 2;

describe("IngestJobs with FixtureJobSource", () => {
  const criteria = { keywords: [] };
  let jobs: InMemoryJobRepository;
  let companies: InMemoryCompanyRepository;
  let useCase: IngestJobs;

  beforeEach(() => {
    jobs = new InMemoryJobRepository();
    companies = new InMemoryCompanyRepository();
    useCase = new IngestJobs([new FixtureJobSource()], jobs, companies);
  });

  it("ingests the fixture catalog, collapsing the intentional duplicates", async () => {
    const result = await useCase.run(criteria);

    expect(result.fetched).toBe(FIXTURE_JOBS.length);
    expect(result.attached).toBe(INTENTIONAL_DUPLICATES);
    expect(result.created).toBe(FIXTURE_JOBS.length - INTENTIONAL_DUPLICATES);
    expect(await jobs.list()).toHaveLength(FIXTURE_JOBS.length - INTENTIONAL_DUPLICATES);
    expect(companies.companies.size).toBe(7);
  });

  it("gives the duplicate pairs two listings each", async () => {
    await useCase.run(criteria);

    const withExtraListings = (await jobs.list()).filter(
      (job) => jobs.listingsFor(job.id).length > 1,
    );

    expect(withExtraListings).toHaveLength(INTENTIONAL_DUPLICATES);
    const sourcePairs = withExtraListings.map((job) =>
      jobs
        .listingsFor(job.id)
        .map((listing) => listing.source)
        .toSorted(),
    );
    expect(sourcePairs).toHaveLength(INTENTIONAL_DUPLICATES);
    expect(sourcePairs).toEqual(
      expect.arrayContaining([
        ["ADZUNA", "FIXTURE"],
        ["FIXTURE", "JOOBLE"],
      ]),
    );
  });

  it("skips everything on a second run", async () => {
    await useCase.run(criteria);

    const second = await useCase.run(criteria);

    expect(second).toEqual({
      fetched: FIXTURE_JOBS.length,
      created: 0,
      attached: 0,
      skipped: FIXTURE_JOBS.length,
      errors: [],
    });
    expect(await jobs.list()).toHaveLength(FIXTURE_JOBS.length - INTENTIONAL_DUPLICATES);
  });

  it("respects criteria when fetching from the fixture source", async () => {
    const result = await useCase.run({ keywords: ["react"], locations: ["Madrid"] });

    expect(result.fetched).toBe(2);
    expect(result).toMatchObject({ created: 1, attached: 1, skipped: 0 });
    expect(await jobs.list()).toHaveLength(1);
  });
});
