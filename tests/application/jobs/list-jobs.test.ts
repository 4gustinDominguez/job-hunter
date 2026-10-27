import { beforeEach, describe, expect, it } from "vitest";
import { ListJobs } from "@/application/jobs/list-jobs";
import { makeJob } from "../../support/make-job";
import { InMemoryJobRepository } from "../../support/in-memory/in-memory-job-repository";

describe("ListJobs", () => {
  let jobs: InMemoryJobRepository;
  let useCase: ListJobs;

  beforeEach(async () => {
    jobs = new InMemoryJobRepository();
    useCase = new ListJobs(jobs);

    await jobs.save(
      makeJob({
        id: "react-madrid",
        url: "https://jobs.example/react-madrid",
        title: "Senior React Developer",
        company: { id: "acme", name: "Acme Software" },
        location: { city: "Madrid", country: "Spain", isRemote: false },
        remoteType: "ONSITE",
        employmentType: "FULL_TIME",
        description: "Build dashboards with React and TypeScript.",
        discoveredAt: new Date("2026-10-18T10:00:00Z"),
      }),
      "company-1",
    );
    await jobs.save(
      makeJob({
        id: "data-barcelona",
        url: "https://jobs.example/data-barcelona",
        title: "Data Engineer",
        company: { id: "globex", name: "Globex" },
        location: { city: "Barcelona", country: "Spain", isRemote: true },
        remoteType: "REMOTE",
        employmentType: "CONTRACT",
        description: "Kubernetes and Kafka pipelines for observability.",
        discoveredAt: new Date("2026-10-19T10:00:00Z"),
      }),
      "company-2",
    );
  });

  it("returns all jobs sorted by discovery date, newest first", async () => {
    const result = await useCase.run();

    expect(result.map((job) => job.id)).toEqual(["data-barcelona", "react-madrid"]);
  });

  it("filters by query across title, company and description", async () => {
    expect(await useCase.run({ query: "react" })).toHaveLength(1);
    expect(await useCase.run({ query: "GLOBEX" })).toHaveLength(1);
    expect(await useCase.run({ query: "kubernetes" })).toHaveLength(1);
  });

  it("trims the query before matching", async () => {
    const result = await useCase.run({ query: "  react  " });

    expect(result.map((job) => job.id)).toEqual(["react-madrid"]);
  });

  it("filters by location", async () => {
    const result = await useCase.run({ location: "barcelona" });

    expect(result.map((job) => job.id)).toEqual(["data-barcelona"]);
  });

  it("filters by remote type and employment type", async () => {
    expect(await useCase.run({ remoteType: "REMOTE" })).toHaveLength(1);
    expect(await useCase.run({ remoteType: "ONSITE" })).toHaveLength(1);
    expect(await useCase.run({ employmentType: "CONTRACT" })).toHaveLength(1);
    expect(await useCase.run({ employmentType: "FULL_TIME" })).toHaveLength(1);
  });

  it("filters by source across all listings of a job", async () => {
    await jobs.attachListing(
      "react-madrid",
      makeJob({
        id: "twin",
        source: "ADZUNA",
        externalId: "adzuna-1",
        url: "https://adzuna.example/1",
      }),
    );

    const fromAdzuna = await useCase.run({ source: "ADZUNA" });
    expect(fromAdzuna.map((job) => job.id)).toEqual(["react-madrid"]);
    expect(await useCase.run({ source: "JOOBLE" })).toHaveLength(0);
  });

  it("returns an empty list when nothing matches", async () => {
    expect(await useCase.run({ query: "zzz-no-match" })).toHaveLength(0);
  });
});

describe("ListJobs dismissed funnel", () => {
  let jobs: InMemoryJobRepository;
  let useCase: ListJobs;

  beforeEach(async () => {
    jobs = new InMemoryJobRepository();
    useCase = new ListJobs(jobs);
    await jobs.save(makeJob({ id: "keep", url: "https://jobs.example/keep" }), "c1");
    await jobs.save(makeJob({ id: "bye", url: "https://jobs.example/bye" }), "c2");
  });

  it("hides dismissed jobs by default and includes them on request", async () => {
    await jobs.setDismissed("bye", true);

    expect((await useCase.run()).map((job) => job.id)).toEqual(["keep"]);

    const withDismissed = await useCase.run({ includeDismissed: true });
    expect(withDismissed.map((job) => job.id).toSorted()).toEqual(["bye", "keep"]);
  });

  it("restores a dismissed job when un-dismissed", async () => {
    await jobs.setDismissed("bye", true);
    await jobs.setDismissed("bye", false);

    expect((await useCase.run()).map((job) => job.id).toSorted()).toEqual(["bye", "keep"]);
  });
});
