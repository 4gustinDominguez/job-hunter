import { afterEach, describe, expect, it, vi } from "vitest";
import { RemotiveClient } from "@/infrastructure/job-sources/remotive/remotive-client";
import { JobSourceError } from "@/infrastructure/job-sources/job-source-error";
import response from "./remotive-response.json";

function mockFetchOnce(body: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RemotiveClient", () => {
  it("fetches software-dev jobs and passes the search param when keywords are given", async () => {
    mockFetchOnce(response);
    const fetchSpy = vi.mocked(fetch);

    const jobs = await new RemotiveClient().fetchJobs("react");

    expect(jobs).toHaveLength(2);
    expect(jobs[0]?.title).toContain("Software Engineer");
    const requested = String(fetchSpy.mock.calls[0]?.[0]);
    expect(requested).toContain("remotive.com/api/remote-jobs");
    expect(requested).toContain("category=software-dev");
    expect(requested).toContain("search=react");
  });

  it("throws a typed JobSourceError on 429 with the rate-limit hint", async () => {
    mockFetchOnce({}, 429);

    await expect(new RemotiveClient().fetchJobs()).rejects.toThrowError(JobSourceError);
    await expect(new RemotiveClient().fetchJobs()).rejects.toThrow(/4 fetches per day/);
  });

  it("throws on an unexpected payload shape", async () => {
    mockFetchOnce({ unexpected: true });

    await expect(new RemotiveClient().fetchJobs()).rejects.toThrow(/payload shape/);
  });

  it("throws a typed error when the network request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(new RemotiveClient().fetchJobs()).rejects.toThrow(/Remotive request failed/);
  });
});
