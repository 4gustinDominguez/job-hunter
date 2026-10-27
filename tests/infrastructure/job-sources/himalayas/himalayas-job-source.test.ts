import { describe, expect, it, vi } from "vitest";
import type { SourceSettings } from "@/application/ports/integration-settings-reader-port";
import type { HimalayasClient } from "@/infrastructure/job-sources/himalayas/himalayas-client";
import { HimalayasJobSource } from "@/infrastructure/job-sources/himalayas/himalayas-job-source";
import response from "./himalayas-response.json";

function stubClient() {
  return {
    fetchJobs: vi.fn().mockResolvedValue(response.jobs),
  } as unknown as HimalayasClient;
}

function settings(overrides: Partial<SourceSettings> = {}): SourceSettings {
  return { enabled: true, countries: [], keywords: [], ...overrides };
}

describe("HimalayasJobSource with integration settings", () => {
  it("never calls the API when the provider is disabled", async () => {
    const client = stubClient();
    const source = new HimalayasJobSource(client, async () => settings({ enabled: false }));

    const result = await source.search({ keywords: [] });

    expect(result).toHaveLength(0);
    expect(client.fetchJobs).not.toHaveBeenCalled();
  });

  it("drops non-engineering titles through the shared strict role gate", async () => {
    const client = stubClient();
    const source = new HimalayasJobSource(client);

    const result = await source.search({ keywords: [] });

    // fixture: designer + three engineering roles
    expect(result).toHaveLength(3);
    expect(result.some((job) => job.title.includes("Designer"))).toBe(false);
  });

  it("forwards apiKey and maxItems, preferring profile keywords as the query", async () => {
    const client = stubClient();
    const source = new HimalayasJobSource(client, async () =>
      settings({ apiKey: "hk-live-7777", keywords: ["python"], maxItems: 40 }),
    );

    await source.search({ keywords: ["react"] });
    expect(client.fetchJobs).toHaveBeenCalledWith({
      query: "react",
      apiKey: "hk-live-7777",
      maxItems: 40,
    });

    await source.search({ keywords: [] });
    expect(client.fetchJobs).toHaveBeenLastCalledWith({
      query: "python",
      apiKey: "hk-live-7777",
      maxItems: 40,
    });
  });

  it("applies the country selection from settings", async () => {
    const client = stubClient();
    const source = new HimalayasJobSource(client, async () =>
      settings({ countries: ["United States"] }),
    );

    const result = await source.search({ keywords: [] });
    expect(result).toHaveLength(3);

    const sourceSpain = new HimalayasJobSource(stubClient(), async () =>
      settings({ countries: ["Spain"] }),
    );
    await expect(sourceSpain.search({ keywords: [] })).resolves.toHaveLength(0);
  });
});
