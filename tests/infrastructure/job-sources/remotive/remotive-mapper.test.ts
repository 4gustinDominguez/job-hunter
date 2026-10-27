import { describe, expect, it } from "vitest";
import { mapRemotiveJob } from "@/infrastructure/job-sources/remotive/remotive-mapper";
import type { RemotiveJob } from "@/infrastructure/job-sources/remotive/remotive-client";
import response from "./remotive-response.json";

const DISCOVERED_AT = new Date("2026-10-21T10:00:00Z");

function jobs(): RemotiveJob[] {
  return (response as { jobs: RemotiveJob[] }).jobs;
}

describe("mapRemotiveJob", () => {
  it("maps a contract job with Worldwide location and free-text salary", () => {
    const job = mapRemotiveJob(jobs()[0], DISCOVERED_AT);

    expect(job).toMatchObject({
      id: "remotive-2091158",
      source: "REMOTIVE",
      externalId: "remotive-2091158",
      url: "https://remotive.com/remote-jobs/software-development/software-engineer-ai-coding-tasks-2091158",
      title: "Software Engineer, AI Coding Tasks",
      remoteType: "REMOTE",
      employmentType: "CONTRACT",
      discoveredAt: DISCOVERED_AT,
    });
    expect(job.company.name).toBe("Askable");
    expect(job.location).toEqual({ isRemote: true });
    expect(job.publishedAt).toEqual(new Date("2026-10-17T16:04:29"));
    expect(job.description).toContain("AI coding tasks");
    expect(job.description).not.toContain("<p>");
    // free-text salary is not parsed for MVP
    expect(job.salary).toBeUndefined();
  });

  it("maps a full_time job, trims tag whitespace and drops empty tags", () => {
    const job = mapRemotiveJob(jobs()[1], DISCOVERED_AT);

    expect(job.employmentType).toBe("FULL_TIME");
    expect(job.location).toEqual({ region: "Europe", isRemote: true });
    expect(job.publishedAt).toEqual(new Date("2026-10-15T09:30:00"));
    expect(job.skills).toEqual(["TypeScript", "React", "Node.js"]);
    expect(jobs()[0].tags).toContain("Typescript ");
  });

  it("leaves optional fields undefined when the API omits them", () => {
    const job = mapRemotiveJob(
      {
        id: 1,
        url: "https://remotive.com/remote-jobs/software-development/x-1",
        title: "X",
        company_name: "Y",
        category: "Software Development",
        tags: [],
        job_type: "",
        publication_date: "not-a-date",
        candidate_required_location: "",
        salary: null,
        description: "",
      },
      DISCOVERED_AT,
    );

    expect(job.employmentType).toBeUndefined();
    expect(job.publishedAt).toBeUndefined();
    expect(job.skills).toBeUndefined();
    expect(job.location?.country).toBeUndefined();
  });
});
