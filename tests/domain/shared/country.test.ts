import { describe, expect, it } from "vitest";
import { countryFromName, isWorldwide, parseJobLocation } from "@/domain/shared/country";

describe("countryFromName", () => {
  it("resolves canonical names, localizations and aliases case-insensitively", () => {
    expect(countryFromName("Germany")).toBe("Germany");
    expect(countryFromName("deutschland")).toBe("Germany");
    expect(countryFromName("Alemania")).toBe("Germany");
    expect(countryFromName("España")).toBe("Spain");
    expect(countryFromName("UK")).toBe("United Kingdom");
    expect(countryFromName("USA")).toBe("United States");
    expect(countryFromName("  Países Bajos ")).toBe("Netherlands");
  });

  it("returns undefined for places that are not countries", () => {
    expect(countryFromName("Berlin")).toBeUndefined();
    expect(countryFromName("Worldwide")).toBeUndefined();
    expect(countryFromName("")).toBeUndefined();
  });
});

describe("isWorldwide", () => {
  it("treats empty and worldwide-scope texts as worldwide", () => {
    expect(isWorldwide(undefined)).toBe(true);
    expect(isWorldwide("")).toBe(true);
    expect(isWorldwide("Worldwide")).toBe(true);
    expect(isWorldwide("Anywhere in the World")).toBe(true);
    expect(isWorldwide("Remote")).toBe(true);
    expect(isWorldwide("Full Remote")).toBe(true);
  });

  it("does not treat countries or regions as worldwide", () => {
    expect(isWorldwide("Germany")).toBe(false);
    expect(isWorldwide("Europe")).toBe(false);
  });
});

describe("parseJobLocation", () => {
  it("maps a gazetted city to city + country", () => {
    expect(parseJobLocation("Hamburg", false)).toEqual({
      city: "Hamburg",
      country: "Germany",
      isRemote: false,
    });
    expect(parseJobLocation("London", true)).toEqual({
      city: "London",
      country: "United Kingdom",
      isRemote: true,
    });
  });

  it("maps a bare country name to country only (no fake city)", () => {
    expect(parseJobLocation("Germany", true)).toEqual({ country: "Germany", isRemote: true });
    expect(parseJobLocation("España", false)).toEqual({ country: "Spain", isRemote: false });
  });

  it("splits 'City, Country'", () => {
    expect(parseJobLocation("Barcelona, Spain", false)).toEqual({
      city: "Barcelona",
      country: "Spain",
      isRemote: false,
    });
  });

  it("keeps multi-country lists and regional scopes as region, never as country", () => {
    expect(parseJobLocation("Europe, USA, UK, Canada, Norway", true)).toEqual({
      region: "Europe, USA, UK, Canada, Norway",
      isRemote: true,
    });
    expect(parseJobLocation("Europe", true)).toEqual({ region: "Europe", isRemote: true });
    expect(parseJobLocation("EMEA", true)).toEqual({ region: "EMEA", isRemote: true });
  });

  it("drops worldwide texts down to the remote flag", () => {
    expect(parseJobLocation("Worldwide", true)).toEqual({ isRemote: true });
    expect(parseJobLocation("", false)).toEqual({ isRemote: false });
    expect(parseJobLocation(undefined, true)).toEqual({ isRemote: true });
  });

  it("keeps unknown single places as city and never invents a country", () => {
    expect(parseJobLocation("Someville", false)).toEqual({
      city: "Someville",
      isRemote: false,
    });
  });
});
