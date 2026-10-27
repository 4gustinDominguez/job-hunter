import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WwrClient } from "@/infrastructure/job-sources/wwr/wwr-client";
import { JobSourceError } from "@/infrastructure/job-sources/job-source-error";

const xml = readFileSync(new URL("./wwr-rss.xml", import.meta.url), "utf8");

function textResponse(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WwrClient", () => {
  it("parses both feeds and dedupes overlapping items by link", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(textResponse(xml));
    vi.stubGlobal("fetch", fetchSpy);

    const items = await new WwrClient().fetchJobs();

    expect(fetchSpy).toHaveBeenCalledTimes(2); // general + programming feed
    expect(items).toHaveLength(5); // fixture items are identical across feeds
    expect(items.every((item) => (item.link ?? "").startsWith("https://weworkremotely.com/"))).toBe(
      true,
    );
    expect(items[0]?.title).toContain("Ignition");
  });

  it("stops after the first feed once maxItems is covered", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(textResponse(xml));
    vi.stubGlobal("fetch", fetchSpy);

    const items = await new WwrClient().fetchJobs({ maxItems: 5 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(items).toHaveLength(5);
  });

  it("caps the merged list at maxItems", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(textResponse(xml)));

    const items = await new WwrClient().fetchJobs({ maxItems: 3 });

    expect(items).toHaveLength(3);
  });

  it("throws a typed JobSourceError on HTTP failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(textResponse("nope", 503)));

    await expect(new WwrClient().fetchJobs()).rejects.toThrowError(JobSourceError);
    await expect(new WwrClient().fetchJobs()).rejects.toThrow(/responded 503/);
  });

  it("throws on a non-RSS payload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(textResponse("<html>maintenance</html>")));

    await expect(new WwrClient().fetchJobs()).rejects.toThrow(/payload shape/);
  });
});
