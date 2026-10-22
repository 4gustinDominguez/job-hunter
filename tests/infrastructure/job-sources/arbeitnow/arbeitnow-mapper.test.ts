import { describe, expect, it } from "vitest";
import { mapArbeitnowJob } from "@/infrastructure/job-sources/arbeitnow/arbeitnow-mapper";
import type { ArbeitnowJob } from "@/infrastructure/job-sources/arbeitnow/arbeitnow-client";
import response from "./arbeitnow-response.json";

const DISCOVERED_AT = new Date("2026-10-21T10:00:00Z");

function jobs(): ArbeitnowJob[] {
  return (response as { data: ArbeitnowJob[] }).data;
}

describe("mapArbeitnowJob", () => {
  it("maps an onsite German job with unix created_at and free-form job_types", () => {
    const job = mapArbeitnowJob(jobs()[0], DISCOVERED_AT);

    expect(job).toMatchObject({
      id: "arbeitnow-junior-marketplace-manager-e-commerce-flexible-remote-option-hamburg-52362",
      source: "ARBEITNOW",
      remoteType: "ONSITE",
      discoveredAt: DISCOVERED_AT,
    });
    expect(job.company.name).toBe("Nordmut GmbH");
    expect(job.location).toEqual({ city: "Hamburg", isRemote: false });
    expect(job.publishedAt?.getTime()).toBe(1792553449 * 1000);
    expect(job.description).toContain("Nordmut");
    expect(job.description).not.toContain("<p>");
    expect(job.skills).toEqual(["Online Marketing"]);
    // German job_types without a clear class stay undefined
    expect(job.employmentType).toBeUndefined();
  });

  it("maps remote=true to REMOTE and Vollzeit to FULL_TIME", () => {
    const job = mapArbeitnowJob(jobs()[1], DISCOVERED_AT);

    expect(job.remoteType).toBe("REMOTE");
    expect(job.location).toEqual({ city: "Berlin", isRemote: true });
    expect(job.employmentType).toBe("FULL_TIME");
    expect(job.externalId).toBe("arbeitnow-senior-frontend-engineer-remote-berlin-52000");
  });

  it("leaves optional fields undefined when the API omits them", () => {
    const job = mapArbeitnowJob(
      {
        slug: "x",
        company_name: "Y",
        title: "X",
        description: "",
        remote: false,
        url: "https://www.arbeitnow.com/jobs/x",
        tags: [],
        job_types: [],
        location: "",
        created_at: 0,
      },
      DISCOVERED_AT,
    );

    expect(job.employmentType).toBeUndefined();
    expect(job.publishedAt).toBeUndefined();
    expect(job.skills).toBeUndefined();
    expect(job.location?.city).toBeUndefined();
  });
});
