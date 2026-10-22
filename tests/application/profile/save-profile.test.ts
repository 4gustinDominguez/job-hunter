import { beforeEach, describe, expect, it } from "vitest";
import { ValidationError } from "@/application/errors";
import { SaveProfile } from "@/application/profile/save-profile";
import type { SaveProfileInput } from "@/application/profile/save-profile";
import { InMemoryCandidateProfileRepository } from "../../support/in-memory/in-memory-candidate-profile-repository";

function makeProfileInput(overrides: Partial<SaveProfileInput> = {}): SaveProfileInput {
  return {
    name: "Alex Morgan",
    email: "alex@example.com",
    experience: [],
    skills: [],
    projects: [],
    education: [],
    preferences: {
      desiredRoles: ["Full Stack Developer"],
      desiredLocations: ["Madrid"],
      remotePreference: "HYBRID",
      excludedCompanies: [],
      employmentTypes: ["FULL_TIME"],
    },
    ...overrides,
  };
}

describe("SaveProfile", () => {
  let profiles: InMemoryCandidateProfileRepository;
  let useCase: SaveProfile;

  beforeEach(() => {
    profiles = new InMemoryCandidateProfileRepository();
    useCase = new SaveProfile(profiles);
  });

  it("creates a profile with a generated id when none is given", async () => {
    const saved = await useCase.run(makeProfileInput());

    expect(saved.id).toBeTruthy();
    expect(profiles.items.get(saved.id)).toEqual(saved);
    expect(profiles.items.size).toBe(1);
  });

  it("updates the existing profile when the id is provided", async () => {
    const created = await useCase.run(makeProfileInput());

    const updated = await useCase.run(makeProfileInput({ id: created.id, name: "Alex M." }));

    expect(updated.id).toBe(created.id);
    expect(profiles.items.size).toBe(1);
    expect(profiles.items.get(created.id)?.name).toBe("Alex M.");
  });

  it("updates the only profile when no id is given (single-profile invariant)", async () => {
    const created = await useCase.run(makeProfileInput());

    const updated = await useCase.run(makeProfileInput({ name: "Imported From CV" }));

    expect(updated.id).toBe(created.id);
    expect(profiles.items.size).toBe(1);
    expect(profiles.items.get(created.id)?.name).toBe("Imported From CV");
  });

  it("trims name and email", async () => {
    const saved = await useCase.run(makeProfileInput({ name: "  Alex  ", email: " a@b.co " }));

    expect(saved.name).toBe("Alex");
    expect(saved.email).toBe("a@b.co");
  });

  it("rejects a blank name", async () => {
    await expect(useCase.run(makeProfileInput({ name: "   " }))).rejects.toThrow(ValidationError);
    expect(profiles.items.size).toBe(0);
  });

  it("rejects a blank email", async () => {
    await expect(useCase.run(makeProfileInput({ email: "  " }))).rejects.toThrow(ValidationError);
    expect(profiles.items.size).toBe(0);
  });

  it("preserves skills, experience and preferences as provided", async () => {
    const input = makeProfileInput({
      skills: [{ id: "s1", name: "TypeScript", category: "PROGRAMMING", level: "EXPERT" }],
      experience: [
        {
          id: "e1",
          company: "Nimbus",
          position: "Developer",
          startDate: new Date("2022-01-01"),
          description: "Built things",
          achievements: [],
          skills: ["TypeScript"],
        },
      ],
    });

    const saved = await useCase.run(input);

    expect(saved.skills).toEqual(input.skills);
    expect(saved.experience).toEqual(input.experience);
    expect(saved.preferences).toEqual(input.preferences);
  });
});
