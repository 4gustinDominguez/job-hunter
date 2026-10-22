import { describe, expect, it } from "vitest";
import { profileDraftSchema } from "@/application/cv/profile-draft-schema";

const validDraft = {
  name: "Alex Morgan",
  email: "alex@example.com",
  phone: "+34 600 123 456",
  summary: "Full stack developer.",
  location: { city: "Madrid", country: "Spain" },
  experience: [
    {
      company: "Nimbus",
      position: "Developer",
      startDate: "2022-03-01",
      endDate: "2024-01-31",
      description: "Built things",
      achievements: ["Cut time by 40%"],
      skills: ["TypeScript"],
    },
  ],
  skills: [{ name: "TypeScript", category: "PROGRAMMING", level: "EXPERT", yearsOfExperience: 6 }],
  projects: [],
  education: [
    { institution: "UPM", degree: "Bachelor", field: "Computer Science", startDate: "2015-09-01" },
  ],
  preferences: {
    desiredRoles: ["Full Stack Developer"],
    desiredLocations: ["Madrid"],
    remotePreference: "HYBRID",
    employmentTypes: ["FULL_TIME"],
  },
};

describe("profileDraftSchema", () => {
  it("parses a complete draft and keeps dates as ISO strings", () => {
    const result = profileDraftSchema.parse(validDraft);

    expect(result.name).toBe("Alex Morgan");
    expect(result.experience[0]?.startDate).toBe("2022-03-01");
    expect(result.experience[0]?.achievements).toEqual(["Cut time by 40%"]);
    expect(result.skills[0]?.category).toBe("PROGRAMMING");
    expect(result.preferences.remotePreference).toBe("HYBRID");
  });

  it("applies defaults for an empty object", () => {
    const result = profileDraftSchema.parse({});

    expect(result.name).toBe("");
    expect(result.email).toBe("");
    expect(result.experience).toEqual([]);
    expect(result.skills).toEqual([]);
    expect(result.projects).toEqual([]);
    expect(result.education).toEqual([]);
    expect(result.preferences).toEqual({
      desiredRoles: [],
      desiredLocations: [],
      remotePreference: "ANY",
      excludedCompanies: [],
      employmentTypes: [],
    });
  });

  it("defaults optional item fields (achievements, description)", () => {
    const result = profileDraftSchema.parse({
      experience: [{ company: "Acme", position: "Dev", startDate: "2020-01-01" }],
      projects: [{ name: "P" }],
    });

    expect(result.experience[0]?.achievements).toEqual([]);
    expect(result.experience[0]?.description).toBe("");
    expect(result.projects[0]?.technologies).toEqual([]);
  });

  it("defaults a missing skill level to INTERMEDIATE", () => {
    const result = profileDraftSchema.parse({
      skills: [{ name: "Node.js", category: "FRAMEWORK" }],
    });

    expect(result.skills[0]?.level).toBe("INTERMEDIATE");
  });

  it("rejects unparseable dates", () => {
    const result = profileDraftSchema.safeParse({
      experience: [{ company: "Acme", position: "Dev", startDate: "not-a-date" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown skill categories and levels", () => {
    expect(
      profileDraftSchema.safeParse({ skills: [{ name: "X", category: "MAGIC", level: "EXPERT" }] })
        .success,
    ).toBe(false);
    expect(
      profileDraftSchema.safeParse({
        skills: [{ name: "X", category: "TOOL", level: "LEGENDARY" }],
      }).success,
    ).toBe(false);
  });

  it("rejects non-array sections", () => {
    expect(profileDraftSchema.safeParse({ experience: "nope" }).success).toBe(false);
    expect(
      profileDraftSchema.safeParse({ preferences: { employmentTypes: "FULL_TIME" } }).success,
    ).toBe(false);
  });
});
