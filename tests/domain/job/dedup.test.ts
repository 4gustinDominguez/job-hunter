import { describe, expect, it } from "vitest";
import {
  canonicalizeUrl,
  DEFAULT_DESCRIPTION_SIMILARITY_THRESHOLD,
  isDuplicate,
  jaccardSimilarity,
  jobContentKey,
} from "@/domain/job/dedup";
import type { Job } from "@/domain/job/job";

const baseJob: Job = {
  id: "job-1",
  source: "ADZUNA",
  externalId: "ext-1",
  url: "https://company.example/jobs/123",
  title: "Senior Full Stack Developer",
  company: { id: "c1", name: "Company X" },
  location: { city: "Madrid", country: "Spain", isRemote: false },
  description:
    "We are looking for a senior full stack developer with React and Node.js experience to build web applications.",
  discoveredAt: new Date("2026-01-01"),
};

function makeJob(overrides: Partial<Job>): Job {
  return { ...baseJob, ...overrides };
}

describe("canonicalizeUrl", () => {
  it("removes utm tracking parameters", () => {
    expect(canonicalizeUrl("https://example.com/j?utm_source=tw&utm_medium=soc&id=7")).toBe(
      "https://example.com/j?id=7",
    );
  });

  it("removes common tracking parameters", () => {
    expect(canonicalizeUrl("https://example.com/j?gclid=abc&ref=tw&id=7")).toBe(
      "https://example.com/j?id=7",
    );
  });

  it("lowercases host and strips www", () => {
    expect(canonicalizeUrl("https://WWW.Example.COM/Job/9")).toBe("https://example.com/Job/9");
  });

  it("removes the fragment", () => {
    expect(canonicalizeUrl("https://example.com/j?id=7#apply")).toBe("https://example.com/j?id=7");
  });

  it("normalizes trailing slashes", () => {
    expect(canonicalizeUrl("https://example.com/jobs/123/")).toBe(
      canonicalizeUrl("https://example.com/jobs/123"),
    );
  });

  it("sorts remaining query parameters", () => {
    expect(canonicalizeUrl("https://example.com/j?b=2&a=1")).toBe(
      canonicalizeUrl("https://example.com/j?a=1&b=2"),
    );
  });

  it("keeps meaningful parameters", () => {
    expect(canonicalizeUrl("https://example.com/j?page=2")).toBe("https://example.com/j?page=2");
  });

  it("falls back to trimmed lowercase for invalid URLs", () => {
    expect(canonicalizeUrl("  Not A URL ")).toBe("not a url");
  });
});

describe("jobContentKey", () => {
  it("is stable across title casing, spacing and separators", () => {
    const a = jobContentKey(makeJob({ title: "Senior Full Stack Developer" }));
    const b = jobContentKey(makeJob({ title: "  senior   full-stack DEVELOPER " }));
    expect(a).toBe(b);
  });

  it("is accent-insensitive", () => {
    const a = jobContentKey({
      title: "Gestor de Proyectos",
      company: { id: "c1", name: "Empresa Ágil" },
    });
    const b = jobContentKey({
      title: "gestor de proyectos",
      company: { id: "c2", name: "Empresa Agil" },
    });
    expect(a).toBe(b);
  });

  it("differs when the company differs", () => {
    const a = jobContentKey({ title: "Dev", company: { id: "c1", name: "Company A" } });
    const b = jobContentKey({ title: "Dev", company: { id: "c2", name: "Company B" } });
    expect(a).not.toBe(b);
  });

  it("differs when the location differs", () => {
    const a = jobContentKey(makeJob({ location: { city: "Madrid", isRemote: false } }));
    const b = jobContentKey(makeJob({ location: { city: "Barcelona", isRemote: false } }));
    expect(a).not.toBe(b);
  });

  it("uses a fallback when location is missing", () => {
    expect(jobContentKey(makeJob({ location: undefined }))).toContain("unknown");
  });

  it("uses a remote fallback when a remote location has no place parts", () => {
    expect(jobContentKey(makeJob({ location: { isRemote: true } }))).toContain("remote");
  });
});

describe("jaccardSimilarity", () => {
  it("returns 1 for identical text", () => {
    expect(jaccardSimilarity("react node api", "react node api")).toBe(1);
  });

  it("returns 0 for disjoint texts", () => {
    expect(jaccardSimilarity("react typescript", "java spring")).toBe(0);
  });

  it("computes intersection over union", () => {
    expect(jaccardSimilarity("react typescript", "react node")).toBeCloseTo(1 / 3);
  });

  it("returns 1 when both texts are empty", () => {
    expect(jaccardSimilarity("", "")).toBe(1);
  });

  it("returns 0 when exactly one text is empty", () => {
    expect(jaccardSimilarity("react", "")).toBe(0);
  });

  it("is case and accent insensitive", () => {
    expect(jaccardSimilarity("Gestión de Proyectos", "gestion de proyectos")).toBe(1);
  });
});

describe("isDuplicate", () => {
  it("detects the same job by id", () => {
    expect(isDuplicate(baseJob, makeJob({ id: "job-1" }))).toBe(true);
  });

  it("detects duplicates by source + externalId", () => {
    const a = makeJob({ id: "a", url: "https://a.example/1" });
    const b = makeJob({ id: "b", url: "https://b.example/2", externalId: "ext-1" });
    expect(isDuplicate(a, b)).toBe(true);
  });

  it("does not match externalId across different sources", () => {
    const a = makeJob({ id: "a", url: "https://a.example/1", externalId: "same" });
    const b = makeJob({
      id: "b",
      source: "JOOBLE",
      url: "https://b.example/2",
      externalId: "same",
      title: "Completely Different Role",
    });
    expect(isDuplicate(a, b)).toBe(false);
  });

  it("detects duplicates by canonical URL despite tracking noise", () => {
    const a = makeJob({
      id: "a",
      source: "ADZUNA",
      externalId: undefined,
      url: "https://jobs.example/42",
    });
    const b = makeJob({
      id: "b",
      source: "JOOBLE",
      externalId: undefined,
      url: "https://www.Jobs.example/42/?utm_source=jooble&ref=feed#apply",
    });
    expect(isDuplicate(a, b)).toBe(true);
  });

  it("detects duplicates by content key when descriptions are similar", () => {
    const a = makeJob({ id: "a", externalId: "x1", url: "https://a.example/1" });
    const b = makeJob({
      id: "b",
      externalId: "x2",
      url: "https://b.example/2",
      description: baseJob.description,
    });
    expect(isDuplicate(a, b)).toBe(true);
  });

  it("keeps different postings with the same content key apart when descriptions diverge", () => {
    const a = makeJob({
      id: "a",
      externalId: "x1",
      url: "https://a.example/1",
      description:
        "React and TypeScript frontend role building dashboards with GraphQL APIs and testing culture.",
    });
    const b = makeJob({
      id: "b",
      externalId: "x2",
      url: "https://b.example/2",
      description:
        "Kubernetes platform engineering operating production clusters with Terraform and observability tooling.",
    });
    expect(isDuplicate(a, b)).toBe(false);
  });

  it("treats same content key with an empty description as duplicate", () => {
    const a = makeJob({ id: "a", externalId: "x1", url: "https://a.example/1", description: "" });
    const b = makeJob({
      id: "b",
      externalId: "x2",
      url: "https://b.example/2",
      description: "",
    });
    expect(isDuplicate(a, b)).toBe(true);
  });

  it("does not match when the content key differs", () => {
    const a = makeJob({ id: "a", externalId: "x1", url: "https://a.example/1" });
    const b = makeJob({
      id: "b",
      externalId: "x2",
      url: "https://b.example/2",
      title: "Staff Engineer",
    });
    expect(isDuplicate(a, b)).toBe(false);
  });

  it("respects a custom description threshold", () => {
    const a = makeJob({ id: "a", externalId: "x1", url: "https://a.example/1" });
    const b = makeJob({
      id: "b",
      externalId: "x2",
      url: "https://b.example/2",
      description: `${baseJob.description} GraphQL.`,
    });
    expect(isDuplicate(a, b)).toBe(true);
    expect(isDuplicate(a, b, { descriptionThreshold: 0.99 })).toBe(false);
    expect(DEFAULT_DESCRIPTION_SIMILARITY_THRESHOLD).toBe(0.3);
  });
});
