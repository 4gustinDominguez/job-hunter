import { describe, expect, it } from "vitest";
import { normalizeText, slugify, tokenize } from "@/domain/shared/text";

describe("normalizeText", () => {
  it("lowercases, trims and collapses internal whitespace", () => {
    expect(normalizeText("  Senior   FULL\tStack ")).toBe("senior full stack");
  });

  it("strips diacritics", () => {
    expect(normalizeText("Gestión de Niños")).toBe("gestion de ninos");
    expect(normalizeText("café")).toBe("cafe");
  });

  it("keeps digits and punctuation other than whitespace", () => {
    expect(normalizeText("Node.js 18.x")).toBe("node.js 18.x");
  });
});

describe("slugify", () => {
  it("converts text to a url-safe slug", () => {
    expect(slugify("Senior Full Stack Developer")).toBe("senior-full-stack-developer");
  });

  it("handles accents and punctuation", () => {
    expect(slugify("¡Café & Niño!")).toBe("cafe-nino");
  });

  it("returns empty string for empty or punctuation-only input", () => {
    expect(slugify("")).toBe("");
    expect(slugify("  -- ")).toBe("");
  });

  it("collapses repeated separators", () => {
    expect(slugify("React///NodeJS___Dev")).toBe("react-nodejs-dev");
  });
});

describe("tokenize", () => {
  it("splits into normalized tokens", () => {
    expect(tokenize("React + TypeScript, 5 años")).toEqual(["react", "typescript", "5", "anos"]);
  });

  it("returns empty array for empty or punctuation-only input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("?!...")).toEqual([]);
  });

  it("keeps one token per occurrence (dedup is the caller's concern)", () => {
    expect(tokenize("react react typescript")).toEqual(["react", "react", "typescript"]);
  });
});
