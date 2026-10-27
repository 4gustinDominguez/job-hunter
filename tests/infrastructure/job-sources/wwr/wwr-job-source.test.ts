import { describe, expect, it, vi } from "vitest";
import type { SourceSettings } from "@/application/ports/integration-settings-reader-port";
import { WwrClient, type WwrItem } from "@/infrastructure/job-sources/wwr/wwr-client";
import { WwrJobSource } from "@/infrastructure/job-sources/wwr/wwr-job-source";
import { readWwrFixtureItems } from "../../../support/wwr-fixture";

function stubClient(items: WwrItem[]) {
  return { fetchJobs: vi.fn().mockResolvedValue(items) } as unknown as WwrClient;
}

function settings(overrides: Partial<SourceSettings> = {}): SourceSettings {
  return { enabled: true, countries: [], keywords: [], ...overrides };
}

const items = readWwrFixtureItems();

describe("WwrJobSource with integration settings", () => {
  it("never calls the feeds when the provider is disabled", async () => {
    const client = stubClient(items);
    const source = new WwrJobSource(client, async () => settings({ enabled: false }));

    expect(await source.search({ keywords: [] })).toHaveLength(0);
    expect(client.fetchJobs).not.toHaveBeenCalled();
  });

  it("keeps only programming categories that also read as software roles", async () => {
    const source = new WwrJobSource(stubClient(items));

    const result = await source.search({ keywords: [] });

    // fixture: DevOps help-desk (title), Design (category), Support (category)
    // are dropped; React dev + Backend engineer survive.
    expect(result.map((job) => job.title).toSorted()).toEqual([
      "Backend Engineer",
      "Senior React Developer",
    ]);
  });

  it("applies the country selection (worldwide survives, US-only does not for Spain)", async () => {
    const source = new WwrJobSource(stubClient(items), async () =>
      settings({ countries: ["Spain"] }),
    );

    const result = await source.search({ keywords: [] });

    expect(result.map((job) => job.title)).toEqual(["Senior React Developer"]);
  });

  it("forwards maxItems to the client", async () => {
    const client = stubClient(items);
    const source = new WwrJobSource(client, async () => settings({ maxItems: 30 }));

    await source.search({ keywords: [] });

    expect(client.fetchJobs).toHaveBeenCalledWith({ maxItems: 30 });
  });
});
