import { beforeEach, describe, expect, it } from "vitest";
import { ValidationError } from "@/application/errors";
import { SaveSearchProfile } from "@/application/search-profiles/save-search-profile";
import type { SaveSearchProfileInput } from "@/application/search-profiles/save-search-profile";
import { InMemorySearchProfileRepository } from "../../support/in-memory/in-memory-search-profile-repository";

function makeSearchProfileInput(
  overrides: Partial<SaveSearchProfileInput> = {},
): SaveSearchProfileInput {
  return {
    name: "Full Stack Madrid",
    keywords: ["typescript", "react"],
    locations: ["Madrid"],
    remotePreference: "HYBRID",
    employmentTypes: ["FULL_TIME"],
    seniority: ["MID", "SENIOR"],
    salary: { minimum: 45000, currency: "EUR" },
    excludedCompanies: [],
    excludedKeywords: ["php"],
    ...overrides,
  };
}

describe("SaveSearchProfile", () => {
  let profiles: InMemorySearchProfileRepository;
  let useCase: SaveSearchProfile;

  beforeEach(() => {
    profiles = new InMemorySearchProfileRepository();
    useCase = new SaveSearchProfile(profiles);
  });

  it("creates a search profile with a generated id", async () => {
    const saved = await useCase.run(makeSearchProfileInput());

    expect(saved.id).toBeTruthy();
    expect(profiles.items.get(saved.id)).toEqual(saved);
    expect(profiles.items.size).toBe(1);
  });

  it("updates the existing profile when the id is provided", async () => {
    const created = await useCase.run(makeSearchProfileInput());

    const updated = await useCase.run(
      makeSearchProfileInput({ id: created.id, name: "Remote Only" }),
    );

    expect(updated.id).toBe(created.id);
    expect(profiles.items.size).toBe(1);
    expect(profiles.items.get(created.id)?.name).toBe("Remote Only");
  });

  it("trims the name", async () => {
    const saved = await useCase.run(makeSearchProfileInput({ name: "  Remote Europe  " }));

    expect(saved.name).toBe("Remote Europe");
  });

  it("rejects a blank name", async () => {
    await expect(useCase.run(makeSearchProfileInput({ name: " " }))).rejects.toThrow(
      ValidationError,
    );
    expect(profiles.items.size).toBe(0);
  });

  it("preserves criteria as provided", async () => {
    const input = makeSearchProfileInput();

    const saved = await useCase.run(input);

    expect(saved.keywords).toEqual(["typescript", "react"]);
    expect(saved.locations).toEqual(["Madrid"]);
    expect(saved.seniority).toEqual(["MID", "SENIOR"]);
    expect(saved.excludedKeywords).toEqual(["php"]);
    expect(saved.salary?.minimum).toBe(45000);
  });
});
