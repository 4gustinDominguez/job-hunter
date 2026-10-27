import { describe, expect, it } from "vitest";
import {
  applyCommonFilters,
  applyIntegrationSettings,
  isSoftwareRole,
  matchesAllowedCountries,
} from "@/infrastructure/job-sources/filters";
import { makeJob } from "../../support/make-job";

function role(title: string) {
  return makeJob({ title });
}

function atLocation(location?: {
  city?: string;
  region?: string;
  country?: string;
  isRemote: boolean;
}) {
  return makeJob({ location });
}

describe("isSoftwareRole", () => {
  it("keeps engineering and development titles (EN/DE/ES)", () => {
    const kept = [
      "Senior Full Stack Developer",
      "Backend Engineer",
      "Principal Software Engineer - Full Stack - AI",
      "AI platform engineer",
      "Full-Stack Engineer — AI Authoring Platform",
      "Analista Programador/a C# - Net Core (remoto)",
      "Senior Fullstack Entwickler (m/w/d)",
      "ServiceNow AI Architect",
      "Data Platform and Automation Engineer",
      "Senior Data Engineer — Document & AI Pipelines",
    ];
    for (const title of kept) {
      expect(isSoftwareRole(role(title)), `expected to keep: ${title}`).toBe(true);
    }
  });

  it("drops sales, marketing, consulting and non-engineering AI roles", () => {
    const dropped = [
      "Head of Sales (m/w/d) AI-Startup",
      "Account Executive / Sales Manager (m/w/d) – Industrial AI & SaaS",
      "Deployment Strategist, AI Solutions",
      "Senior GTM Systems AI and Automation Engineer",
      "AI Trainer - Video Annotation",
      "Co-Founder & CTO (gn), Industrial Data for AI",
      "Werkstudent:in AI Solution Architecture & KI-Produktentwicklung",
      "Working Student — AI Engineering & Document Intelligence",
      "Senior KI-Berater:in Microsoft AI und Copilot",
      "Head of Sales",
      "Operations Manager",
      "Product Manager",
      "Technical Writer",
    ];
    for (const title of dropped) {
      expect(isSoftwareRole(role(title)), `expected to drop: ${title}`).toBe(false);
    }
  });

  it("drops junior and entry-level titles (mid/senior gate)", () => {
    const dropped = [
      "Junior Frontend Developer",
      "React Internship",
      "Graduate Software Engineer",
      "Working Student Backend",
      "Trainee - Java",
    ];
    for (const title of dropped) {
      expect(isSoftwareRole(role(title)), `expected to drop: ${title}`).toBe(false);
    }
  });

  it("does not over-match substrings inside real titles", () => {
    // "intern" must not eat "International"; word-boundary exclusions only.
    expect(isSoftwareRole(role("Senior Software Engineer, International Team"))).toBe(true);
    // "development" hits the token but "business development" is excluded.
    expect(isSoftwareRole(role("Business Development Engineer"))).toBe(false);
  });
});

describe("applyCommonFilters", () => {
  it("drops non-software roles even with empty criteria", () => {
    const jobs = [
      role("Senior React Developer"),
      role("Head of Sales (m/w/d) AI-Startup"),
      role("Marketing Manager"),
    ];

    const result = applyCommonFilters(jobs, { keywords: [] });

    expect(result.map((job) => job.title)).toEqual(["Senior React Developer"]);
  });

  it("still applies keyword, remote and excluded-company criteria", () => {
    const jobs = [
      makeJob({
        title: "Senior React Developer",
        description: "React dashboards with GraphQL APIs and design systems.",
      }),
      makeJob({
        title: "Senior Node.js Developer",
        company: { id: "x", name: "Acme" },
        description: "Node.js services with Fastify, Kafka and PostgreSQL.",
      }),
    ];

    const byKeyword = applyCommonFilters(jobs, { keywords: ["node"] });
    expect(byKeyword.map((job) => job.title)).toEqual(["Senior Node.js Developer"]);

    const byRemote = applyCommonFilters(jobs, { keywords: [], remotePreference: "REMOTE" });
    expect(byRemote).toHaveLength(0); // makeJob defaults to ONSITE

    const byCompany = applyCommonFilters(jobs, { keywords: [], excludedCompanies: ["Acme"] });
    expect(byCompany.map((job) => job.title)).toEqual(["Senior React Developer"]);
  });
});

describe("matchesAllowedCountries", () => {
  it("passes everything when no countries are selected", () => {
    expect(matchesAllowedCountries(atLocation({ country: "Germany", isRemote: true }), [])).toBe(
      true,
    );
  });

  it("matches by exact country and keeps unknown-geo jobs", () => {
    expect(
      matchesAllowedCountries(atLocation({ country: "Spain", isRemote: false }), ["Spain"]),
    ).toBe(true);
    expect(
      matchesAllowedCountries(atLocation({ country: "Germany", isRemote: true }), ["Spain"]),
    ).toBe(false);
    expect(
      matchesAllowedCountries(atLocation({ city: "Someville", isRemote: false }), ["Spain"]),
    ).toBe(true);
    expect(matchesAllowedCountries(atLocation({ isRemote: true }), ["Spain"])).toBe(true);
  });

  it("honours the Europe pseudo-option and the European set", () => {
    expect(
      matchesAllowedCountries(atLocation({ country: "Germany", isRemote: true }), ["Europe"]),
    ).toBe(true);
    expect(
      matchesAllowedCountries(atLocation({ country: "United States", isRemote: true }), ["Europe"]),
    ).toBe(false);
    expect(
      matchesAllowedCountries(atLocation({ country: "Portugal", isRemote: true }), ["Spain"]),
    ).toBe(false);
  });

  it("reads stored region scopes and multi-country lists", () => {
    expect(
      matchesAllowedCountries(atLocation({ region: "Europe", isRemote: true }), ["Spain"]),
    ).toBe(true);
    expect(matchesAllowedCountries(atLocation({ region: "EMEA", isRemote: true }), ["Spain"])).toBe(
      true,
    );
    expect(
      matchesAllowedCountries(
        atLocation({ region: "Europe, USA, UK, Canada, Norway", isRemote: true }),
        ["United Kingdom"],
      ),
    ).toBe(true);
    expect(
      matchesAllowedCountries(atLocation({ region: "USA, Canada", isRemote: true }), ["Spain"]),
    ).toBe(false);
  });
});

describe("applyIntegrationSettings", () => {
  it("applies the country selection and the per-run cap", () => {
    const jobs = [
      makeJob({ title: "Backend Engineer", location: { country: "Spain", isRemote: false } }),
      makeJob({ title: "Backend Engineer", location: { country: "Germany", isRemote: false } }),
      makeJob({ title: "Backend Engineer", location: { country: "Spain", isRemote: false } }),
    ];

    const geo = applyIntegrationSettings(jobs, {
      enabled: true,
      countries: ["Spain"],
      keywords: [],
    });
    expect(geo).toHaveLength(2);

    const capped = applyIntegrationSettings(jobs, {
      enabled: true,
      countries: [],
      keywords: [],
      maxItems: 1,
    });
    expect(capped).toHaveLength(1);

    expect(applyIntegrationSettings(jobs, undefined)).toHaveLength(3);
  });
});
