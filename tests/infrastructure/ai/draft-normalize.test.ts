import { describe, expect, it } from "vitest";
import { tryParseDraft } from "@/infrastructure/ai/draft-normalize";

function draftWith(overrides: Record<string, unknown>): string {
  return JSON.stringify({
    name: "Alex",
    email: "alex@example.com",
    experience: [],
    skills: [],
    projects: [],
    education: [],
    preferences: {},
    ...overrides,
  });
}

describe("tryParseDraft", () => {
  it("parses a minimal valid draft", () => {
    const result = tryParseDraft(draftWith({}));

    expect(result.ok).toBe(true);
  });

  it("strips null values instead of failing optional fields", () => {
    const result = tryParseDraft(
      draftWith({ phone: null, summary: null, location: { city: "Madrid", region: null } }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.phone).toBeUndefined();
      expect(result.draft.location?.city).toBe("Madrid");
      expect(result.draft.location?.region).toBeUndefined();
    }
  });

  it("drops endDate values that are not dates (present/current/garbage)", () => {
    const result = tryParseDraft(
      draftWith({
        experience: [
          { company: "Acme", position: "Dev", startDate: "2022-01-01", endDate: "present" },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.experience[0]?.endDate).toBeUndefined();
    }
  });

  it("maps invented categories and levels onto the domain enums", () => {
    const result = tryParseDraft(
      draftWith({
        skills: [
          { name: "PostgreSQL", category: "database", level: "advanced" },
          { name: "GraphQL", category: "API", level: "B2" },
          { name: "TypeScript", category: "tools", level: "senior" },
          { name: "React", category: "SOFT SKILL", level: "excellent" },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.skills.map((s) => `${s.category}/${s.level}`)).toEqual([
        "TOOL/ADVANCED",
        "TOOL/INTERMEDIATE",
        "TOOL/ADVANCED",
        "SOFT_SKILL/EXPERT",
      ]);
    }
  });

  it("defaults a missing skill level to INTERMEDIATE", () => {
    const result = tryParseDraft(
      draftWith({ skills: [{ name: "Node.js", category: "FRAMEWORK" }] }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.skills[0]?.level).toBe("INTERMEDIATE");
    }
  });

  it("drops an unusable salaryExpectation instead of failing the draft", () => {
    const result = tryParseDraft(draftWith({ preferences: { salaryExpectation: {} } }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.preferences.salaryExpectation).toBeUndefined();
    }
  });

  it("coerces a numeric-string salary and keeps valid ones", () => {
    const result = tryParseDraft(
      draftWith({ preferences: { salaryExpectation: { minimum: "58000", currency: "EUR" } } }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.preferences.salaryExpectation).toEqual({
        minimum: 58000,
        currency: "EUR",
      });
    }
  });

  it("reports the received raw value for invalid enums", () => {
    const result = tryParseDraft(
      draftWith({ skills: [{ name: "X", category: "QUANTUM", level: "EXPERT" }] }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issue).toContain("skills.0.category");
      expect(result.issue).toContain('(received "QUANTUM")');
    }
  });

  it("reports invalid JSON clearly", () => {
    const result = tryParseDraft("not json at all");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issue).toBe("The response is not valid JSON.");
    }
  });

  it("parses JSON wrapped in markdown fences or prose", () => {
    const result = tryParseDraft(`Sure!\n\`\`\`json\n${draftWith({})}\n\`\`\`\nDone.`);

    expect(result.ok).toBe(true);
  });
});
