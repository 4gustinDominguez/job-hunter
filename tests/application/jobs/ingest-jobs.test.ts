import { beforeEach, describe, expect, it } from "vitest";
import { IngestJobs } from "@/application/jobs/ingest-jobs";
import type { Job } from "@/domain/job/job";
import { makeJob } from "../../support/make-job";
import { InMemoryCompanyRepository } from "../../support/in-memory/in-memory-company-repository";
import { InMemoryJobRepository } from "../../support/in-memory/in-memory-job-repository";
import { FailingJobSource, StubJobSource } from "../../support/in-memory/stub-job-source";

describe("IngestJobs", () => {
  const criteria = { keywords: ["react"] };
  let jobs: InMemoryJobRepository;
  let companies: InMemoryCompanyRepository;

  beforeEach(() => {
    jobs = new InMemoryJobRepository();
    companies = new InMemoryCompanyRepository();
  });

  function ingest(sourceJobs: Job[]) {
    return new IngestJobs([new StubJobSource(sourceJobs)], jobs, companies).run(criteria);
  }

  it("creates a job and company for unseen listings", async () => {
    const result = await ingest([makeJob()]);

    expect(result).toEqual({ fetched: 1, created: 1, attached: 0, skipped: 0, errors: [] });
    expect(await jobs.list()).toHaveLength(1);
    expect(companies.companies.size).toBe(1);
  });

  it("assigns a fresh id instead of trusting the source-provided one", async () => {
    await ingest([makeJob({ id: "source-owned-id" })]);

    const [stored] = await jobs.list();
    expect(stored.id).not.toBe("source-owned-id");
  });

  it("skips re-ingest of the same listing", async () => {
    const job = makeJob();
    const useCase = new IngestJobs([new StubJobSource([job])], jobs, companies);
    await useCase.run(criteria);
    const second = await useCase.run(criteria);

    expect(second).toEqual({ fetched: 1, created: 0, attached: 0, skipped: 1, errors: [] });
    expect(await jobs.list()).toHaveLength(1);
  });

  it("skips when the same source and external id arrives under a new url", async () => {
    const first = makeJob();
    await ingest([first]);
    const reposted = makeJob({
      id: "repost",
      externalId: first.externalId,
      url: "https://other.example/repost",
    });

    const result = await ingest([reposted]);

    expect(result).toEqual({ fetched: 1, created: 0, attached: 0, skipped: 1, errors: [] });
    const [stored] = await jobs.list();
    expect(jobs.listingsFor(stored.id)).toHaveLength(1);
  });

  it("skips when the url differs only by tracking noise", async () => {
    await ingest([makeJob({ url: "https://jobs.example/role" })]);
    const noisy = makeJob({
      id: "noisy",
      externalId: "noisy-ext",
      url: "https://www.jobs.example/role/?utm_source=x&ref=y#apply",
    });

    const result = await ingest([noisy]);

    expect(result.skipped).toBe(1);
    expect(result.attached).toBe(0);
    const [stored] = await jobs.list();
    expect(jobs.listingsFor(stored.id)).toHaveLength(1);
  });

  it("attaches a cross-source duplicate as an extra listing on the canonical job", async () => {
    const original = makeJob({ source: "FIXTURE", url: "https://jobs.example/senior-react" });
    const twin = makeJob({
      id: "twin",
      source: "ADZUNA",
      externalId: "adzuna-991",
      url: "https://adzuna.example/detail/991?utm_source=feed",
    });

    const result = await ingest([original, twin]);

    expect(result).toEqual({ fetched: 2, created: 1, attached: 1, skipped: 0, errors: [] });
    const [stored] = await jobs.list();
    const listings = jobs.listingsFor(stored.id);
    expect(listings).toHaveLength(2);
    expect(listings.map((listing) => listing.source)).toEqual(["FIXTURE", "ADZUNA"]);
    expect(companies.companies.size).toBe(1);
  });

  it("keeps jobs apart when descriptions diverge under the same content key", async () => {
    const original = makeJob({
      description:
        "React and TypeScript frontend dashboards with GraphQL APIs and testing culture.",
    });
    const divergent = makeJob({
      id: "divergent",
      externalId: "div-ext",
      url: "https://jobs.example/divergent",
      description:
        "Kubernetes platform engineering operating production clusters with Terraform observability tooling.",
    });

    const result = await ingest([original, divergent]);

    expect(result).toEqual({ fetched: 2, created: 2, attached: 0, skipped: 0, errors: [] });
    expect(await jobs.list()).toHaveLength(2);
  });

  it("keeps genuinely different jobs apart", async () => {
    const first = makeJob();
    const second = makeJob({
      id: "second",
      externalId: "second-ext",
      url: "https://jobs.example/second",
      title: "Data Engineer",
      company: { id: "c-globex", name: "Globex" },
      location: { city: "Sevilla", country: "Spain", isRemote: false },
      description: "Build batch and streaming pipelines with Airflow and Kafka.",
    });

    const result = await ingest([first, second]);

    expect(result.created).toBe(2);
    expect(await jobs.list()).toHaveLength(2);
  });

  it("aggregates results across multiple sources", async () => {
    const first = new StubJobSource([makeJob()]);
    const second = new StubJobSource([
      makeJob({
        id: "other",
        externalId: "other-ext",
        url: "https://jobs.example/other",
        title: "Data Engineer",
        company: { id: "c-globex", name: "Globex" },
        location: { city: "Sevilla", country: "Spain", isRemote: false },
        description: "Build batch and streaming pipelines with Airflow and Kafka.",
      }),
    ]);

    const result = await new IngestJobs([first, second], jobs, companies).run(criteria);

    expect(result).toEqual({ fetched: 2, created: 2, attached: 0, skipped: 0, errors: [] });
    expect(await jobs.list()).toHaveLength(2);
  });

  it("forwards the search criteria to every source", async () => {
    const source = new StubJobSource([]);
    const detailed = { keywords: ["react", "typescript"], locations: ["Madrid"] };

    await new IngestJobs([source], jobs, companies).run(detailed);

    expect(source.lastCriteria).toEqual(detailed);
  });

  it("returns zeros when sources return nothing", async () => {
    const result = await ingest([]);

    expect(result).toEqual({ fetched: 0, created: 0, attached: 0, skipped: 0, errors: [] });
    expect(await jobs.list()).toHaveLength(0);
  });

  it("continues past a failing source and records the error", async () => {
    const failing = new FailingJobSource("REMOTIVE");
    const healthy = new StubJobSource([makeJob()]);

    const result = await new IngestJobs([failing, healthy], jobs, companies).run(criteria);

    expect(result.errors).toEqual([{ source: "REMOTIVE", message: "boom: rate limited" }]);
    expect(result.fetched).toBe(1);
    expect(result.created).toBe(1);
    expect(await jobs.list()).toHaveLength(1);
  });

  it("records errors from every failing source and keeps ingesting the rest", async () => {
    const remotiveDown = new FailingJobSource("REMOTIVE");
    const arbeitnowDown = new FailingJobSource("ARBEITNOW");
    const healthy = new StubJobSource([makeJob()]);

    const result = await new IngestJobs(
      [remotiveDown, arbeitnowDown, healthy],
      jobs,
      companies,
    ).run(criteria);

    expect(result.errors.map((error) => error.source)).toEqual(["REMOTIVE", "ARBEITNOW"]);
    expect(result.created).toBe(1);
  });
});
