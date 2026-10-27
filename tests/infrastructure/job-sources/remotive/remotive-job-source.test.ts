import { describe, expect, it } from "vitest";
import type { RemotiveClient } from "@/infrastructure/job-sources/remotive/remotive-client";
import type { RemotiveJob } from "@/infrastructure/job-sources/remotive/remotive-client";
import { RemotiveJobSource } from "@/infrastructure/job-sources/remotive/remotive-job-source";

function apiJob(overrides: Partial<RemotiveJob> = {}): RemotiveJob {
  return {
    id: 1,
    url: "https://remotive.com/remote-jobs/software-development/senior-backend-engineer-1",
    title: "Senior Backend Engineer",
    company_name: "Acme",
    category: "Software Development",
    tags: ["Go"],
    job_type: "full_time",
    publication_date: "2026-10-01T00:00:00",
    candidate_required_location: "Spain",
    salary: null,
    description: "Build Go services with PostgreSQL and Kafka.",
    ...overrides,
  };
}

function clientStub(jobs: RemotiveJob[], queries: (string | undefined)[]) {
  return {
    fetchJobs: async (query?: string) => {
      queries.push(query);
      return jobs;
    },
  } as unknown as RemotiveClient;
}

describe("RemotiveJobSource with integration settings", () => {
  it("never calls the API when the provider is disabled", async () => {
    const queries: (string | undefined)[] = [];
    const source = new RemotiveJobSource(clientStub([apiJob()], queries), async () => ({
      enabled: false,
      countries: [],
      keywords: [],
    }));

    const result = await source.search({ keywords: [] });

    expect(result).toHaveLength(0);
    expect(queries).toHaveLength(0);
  });

  it("uses provider keywords as the API query when the profile has none", async () => {
    const queries: (string | undefined)[] = [];
    const source = new RemotiveJobSource(clientStub([apiJob()], queries), async () => ({
      enabled: true,
      countries: [],
      keywords: ["python", "data"],
      maxItems: undefined,
    }));

    await source.search({ keywords: [] });
    expect(queries).toEqual(["python data"]);

    await source.search({ keywords: ["react"] });
    expect(queries).toEqual(["python data", "react"]);
  });

  it("applies the country filter and per-run cap after the common filters", async () => {
    const queries: (string | undefined)[] = [];
    const source = new RemotiveJobSource(
      clientStub(
        [
          apiJob({ id: 1, candidate_required_location: "Spain" }),
          apiJob({ id: 2, candidate_required_location: "Germany" }),
          apiJob({ id: 3, candidate_required_location: "France" }),
        ],
        queries,
      ),
      async () => ({ enabled: true, countries: ["Spain", "France"], keywords: [], maxItems: 1 }),
    );

    const result = await source.search({ keywords: [] });

    expect(result).toHaveLength(1);
    expect(result[0]?.location?.country).toBe("Spain");
  });

  it("keeps working without a settings reader (backwards compatible)", async () => {
    const queries: (string | undefined)[] = [];
    const source = new RemotiveJobSource(clientStub([apiJob()], queries));

    const result = await source.search({ keywords: [] });

    expect(result).toHaveLength(1);
    expect(queries).toEqual([undefined]);
  });
});
