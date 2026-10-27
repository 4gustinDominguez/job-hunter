import { describe, expect, it } from "vitest";
import { mapHimalayasJob } from "@/infrastructure/job-sources/himalayas/himalayas-mapper";
import response from "./himalayas-response.json";

const DISCOVERED_AT = new Date("2026-10-21T10:00:00Z");

describe("mapHimalayasJob", () => {
  it("collapses near-worldwide restriction lists to the remote flag", () => {
    const job = mapHimalayasJob(response.jobs[0], DISCOVERED_AT);

    expect(job).toMatchObject({
      source: "HIMALAYAS",
      remoteType: "REMOTE",
      employmentType: "CONTRACT",
      discoveredAt: DISCOVERED_AT,
    });
    expect(job.location).toEqual({ isRemote: true });
    expect(job.id.startsWith("himalayas-")).toBe(true);
    expect(job.externalId).toBe(job.id);
    expect(job.url).toContain("himalayas.app/companies/lemon-io/jobs/senior-ui-ux-designer");
    expect(job.description).not.toContain("<p>");
    expect(job.publishedAt).toEqual(new Date(1792675549 * 1000));
    expect(job.skills).toBeUndefined();
    // null min/max means no salary even when currency/period are present
    expect(job.salary).toBeUndefined();
  });

  it("maps a single-country restriction, salary and full-time contract", () => {
    const job = mapHimalayasJob(response.jobs[1], DISCOVERED_AT);

    expect(job.location).toEqual({ country: "United States", isRemote: true });
    expect(job.salary).toEqual({
      minimum: 125600,
      maximum: 157000,
      currency: "USD",
      period: "yearly",
    });
    expect(job.employmentType).toBe("FULL_TIME");
    expect(job.company.name).toBe("Natera");
    expect(job.company.id).toBe("natera");
  });

  it("maps a short multi-country list to a region and omits a null-currency salary", () => {
    const job = mapHimalayasJob(response.jobs[2], DISCOVERED_AT);

    expect(job.location).toEqual({ region: "India, United States", isRemote: true });
    expect(job.salary).toBeUndefined();
    expect(job.description).toContain("COOL");
  });
});
