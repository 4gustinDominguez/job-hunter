import { describe, expect, it } from "vitest";
import { extractApplyUrl } from "@/domain/job/apply-url";

describe("extractApplyUrl", () => {
  it("prefers the URL after a labelled 'URL:' marker", () => {
    const description =
      "About us.\nURL: https://jobs.workable.com/company/abc/jobs-at-acme\nOther link https://example.org/second";

    expect(extractApplyUrl(description)).toBe("https://jobs.workable.com/company/abc/jobs-at-acme");
  });

  it("accepts 'Apply here:' and 'How to apply:' labels", () => {
    expect(extractApplyUrl("Apply here: https://jobs.example.com/requisitions/123")).toBe(
      "https://jobs.example.com/requisitions/123",
    );
    expect(extractApplyUrl("How to apply: https://boards.greenhouse.io/acme/jobs/99")).toBe(
      "https://boards.greenhouse.io/acme/jobs/99",
    );
  });

  it("falls back to the first usable external link", () => {
    const description = "We are hiring! See https://acme.dev/careers for details.";

    expect(extractApplyUrl(description)).toBe("https://acme.dev/careers");
  });

  it("skips the WWR listing itself", () => {
    const description =
      "Apply at https://weworkremotely.com/remote-jobs/1234 or https://acme.dev/jobs";

    expect(extractApplyUrl(description)).toBe("https://acme.dev/jobs");
  });

  it("skips social profiles", () => {
    const description = "Follow us https://twitter.com/acme and https://linkedin.com/company/acme";

    expect(extractApplyUrl(description)).toBeUndefined();
  });

  it("returns undefined when there is no link at all", () => {
    expect(extractApplyUrl("Great team, great salary, no URL whatsoever.")).toBeUndefined();
  });

  it("trims trailing punctuation from prose", () => {
    expect(extractApplyUrl("Careers page: https://acme.dev/careers.")).toBe(
      "https://acme.dev/careers",
    );
  });

  it("ignores labelled markers pointing at excluded hosts", () => {
    const description =
      "URL: https://www.weworkremotely.com/remote-jobs/1\nApply: https://acme.dev/apply";

    expect(extractApplyUrl(description)).toBe("https://acme.dev/apply");
  });
});
