import { afterEach, describe, expect, it, vi } from "vitest";
import { ArbeitnowClient } from "@/infrastructure/job-sources/arbeitnow/arbeitnow-client";
import { JobSourceError } from "@/infrastructure/job-sources/job-source-error";
import response from "./arbeitnow-response.json";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ArbeitnowClient", () => {
  it("collects jobs across pages while links.next is present", async () => {
    const pageWithoutNext = { ...response, links: { next: null } };
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(response))
      .mockResolvedValueOnce(jsonResponse(pageWithoutNext));
    vi.stubGlobal("fetch", fetchSpy);

    const jobs = await new ArbeitnowClient().fetchJobs();

    expect(jobs).toHaveLength(4);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain("page=1");
    expect(String(fetchSpy.mock.calls[1]?.[0])).toContain("page=2");
  });

  it("stops at the first page when links.next is null", async () => {
    const pageWithoutNext = { ...response, links: { next: null } };
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(pageWithoutNext));
    vi.stubGlobal("fetch", fetchSpy);

    const jobs = await new ArbeitnowClient().fetchJobs();

    expect(jobs).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("throws a typed JobSourceError on 429", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 429)));

    await expect(new ArbeitnowClient().fetchJobs()).rejects.toThrowError(JobSourceError);
    await expect(new ArbeitnowClient().fetchJobs()).rejects.toThrow(/Rate limited by Arbeitnow/);
  });

  it("throws on an unexpected payload shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: "nope" })));

    await expect(new ArbeitnowClient().fetchJobs()).rejects.toThrow(/payload shape/);
  });
});
