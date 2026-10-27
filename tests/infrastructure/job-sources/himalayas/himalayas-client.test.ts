import { afterEach, describe, expect, it, vi } from "vitest";
import { HimalayasClient } from "@/infrastructure/job-sources/himalayas/himalayas-client";
import { JobSourceError } from "@/infrastructure/job-sources/job-source-error";
import response from "./himalayas-response.json";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function fullPage() {
  return { jobs: Array.from({ length: 20 }, () => response.jobs[0]), totalCount: 500 };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HimalayasClient", () => {
  it("stops on the first short page and requests recent senior/mid jobs", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(response));
    vi.stubGlobal("fetch", fetchSpy);

    const jobs = await new HimalayasClient().fetchJobs();

    expect(jobs).toHaveLength(4);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = String(fetchSpy.mock.calls[0]?.[0]);
    expect(url).toContain("himalayas.app/jobs/api/search");
    expect(url).toContain("sort=recent");
    expect(url).toContain("seniority=Senior%2CMid-level");
    expect(url).toContain("page=1");
    expect(url).not.toContain("q=");
  });

  it("walks pages until a short one and stops at the page cap", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(fullPage()))
      .mockResolvedValueOnce(jsonResponse(fullPage()))
      .mockResolvedValue(jsonResponse(response));
    vi.stubGlobal("fetch", fetchSpy);

    const jobs = await new HimalayasClient().fetchJobs();

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(String(fetchSpy.mock.calls[2]?.[0])).toContain("page=3");
    expect(jobs).toHaveLength(44);
  });

  it("derives the page budget from maxItems and stops once reached", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(fullPage()))
      .mockResolvedValue(jsonResponse(fullPage()));
    vi.stubGlobal("fetch", fetchSpy);

    const jobs = await new HimalayasClient().fetchJobs({ maxItems: 25 });

    expect(fetchSpy).toHaveBeenCalledTimes(2); // ceil(25/20) = 2 pages
    expect(jobs).toHaveLength(40);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain("page=1");
    expect(String(fetchSpy.mock.calls[1]?.[0])).toContain("page=2");
  });

  it("sends the query and the API key as bearer when provided", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(response));
    vi.stubGlobal("fetch", fetchSpy);

    await new HimalayasClient().fetchJobs({ query: "react", apiKey: "hk-test-1234" });

    const [url, init] = fetchSpy.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toContain("q=react");
    expect(init.headers.authorization).toBe("Bearer hk-test-1234");
  });

  it("throws a typed JobSourceError on 429 with the key hint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 429)));

    await expect(new HimalayasClient().fetchJobs()).rejects.toThrowError(JobSourceError);
    await expect(new HimalayasClient().fetchJobs()).rejects.toThrow(/free API key/);
  });

  it("throws on an unexpected payload shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ jobs: "nope" })));

    await expect(new HimalayasClient().fetchJobs()).rejects.toThrow(/payload shape/);
  });
});
