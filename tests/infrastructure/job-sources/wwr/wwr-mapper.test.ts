import { describe, expect, it } from "vitest";
import type { WwrItem } from "@/infrastructure/job-sources/wwr/wwr-client";
import { mapWwrJob } from "@/infrastructure/job-sources/wwr/wwr-mapper";
import { readWwrFixtureItems } from "../../../support/wwr-fixture";

const DISCOVERED_AT = new Date("2026-10-21T10:00:00Z");

const items: WwrItem[] = readWwrFixtureItems();

describe("mapWwrJob", () => {
  it("splits 'Company: Title', keeps worldwide scope and parses skills", () => {
    const react = items.find((item) => item.title?.includes("Senior React Developer"));
    expect(react).toBeDefined();
    const job = mapWwrJob(react as WwrItem, DISCOVERED_AT);

    expect(job.title).toBe("Senior React Developer");
    expect(job.company.name).toBe("Acme Corp");
    expect(job.location).toEqual({ isRemote: true });
    expect(job.remoteType).toBe("REMOTE");
    expect(job.employmentType).toBe("FULL_TIME");
    expect(job.skills).toEqual(["React", "Node.js", "TypeScript"]);
    expect(job.description).not.toContain("<p>");
    expect(job.description).toContain("React");
    expect(job.source).toBe("WWR");
    expect(job.id.startsWith("wwr-")).toBe(true);
    expect(job.publishedAt).toEqual(new Date("Mon, 26 Oct 2026 09:00:00 +0000"));
  });

  it("strips flags and long names from the country field", () => {
    const backend = items.find((item) => item.title?.includes("Backend Engineer"));
    expect(backend).toBeDefined();
    const job = mapWwrJob(backend as WwrItem, DISCOVERED_AT);

    expect(job.location).toEqual({ country: "United States", isRemote: true });
    expect(job.employmentType).toBe("CONTRACT");
    expect(job.skills).toBeUndefined();
  });

  it("collapses huge country lists and reads regional scopes from region", () => {
    const design = items.find((item) => item.title?.includes("Head of Design"));
    expect(design).toBeDefined();
    expect(mapWwrJob(design as WwrItem, DISCOVERED_AT).location).toEqual({ isRemote: true });

    const crm = items.find((item) => item.title?.includes("Lifecycle"));
    expect(crm).toBeDefined();
    const crmJob = mapWwrJob(crm as WwrItem, DISCOVERED_AT);
    expect(crmJob.location).toEqual({ region: "EMEA", isRemote: true });
    expect(crmJob.title).toBe("Lifecycle & CRM Specialist"); // XML entities decoded
  });

  it("keeps comma-containing company names intact", () => {
    const helpdesk = items.find((item) => item.title?.includes("Help Desk"));
    expect(helpdesk).toBeDefined();
    expect(mapWwrJob(helpdesk as WwrItem, DISCOVERED_AT).company.name).toBe("Ignition, Inc.");
    expect(mapWwrJob(helpdesk as WwrItem, DISCOVERED_AT).title).toBe(
      "MSP Mac Help Desk Guru (work from home)",
    );
  });
});
