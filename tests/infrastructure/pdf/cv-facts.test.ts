import { describe, expect, it } from "vitest";
import { buildFactsBlock, extractCvFacts } from "@/infrastructure/pdf/cv-facts";

const REALISTIC_CV = `Marta Rivera Alvarez
marta.rivera@example.com · +34 600 111 222 · Madrid, Spain

SUMMARY
Full stack developer with 8 years building SaaS products.

EXPERIENCE
Senior Full Stack Developer @ Nimbus SaaS (2022 - present)
Frontend Developer @ Digital Grove (2019 - 2022)

SKILLS
TypeScript (expert), React (expert), Node.js (advanced)
• PostgreSQL
• GraphQL — advanced
Docker, Playwright (intermediate), Git

EDUCATION
Bachelor in Computer Science @ Universidad Politecnica de Madrid (2013 - 2017)
`;

describe("extractCvFacts", () => {
  it("extracts email, phone, name and skills from a realistic CV", () => {
    const facts = extractCvFacts(REALISTIC_CV);

    expect(facts.email).toBe("marta.rivera@example.com");
    expect(facts.phone).toBe("+34 600 111 222");
    expect(facts.name).toBe("Marta Rivera Alvarez");
    expect(facts.skillNames).toEqual([
      "TypeScript",
      "React",
      "Node.js",
      "PostgreSQL",
      "GraphQL",
      "Docker",
      "Playwright",
      "Git",
    ]);
  });

  it("extracts the first email and does not mangle plus-addressing", () => {
    const facts = extractCvFacts("contact me at dev+jobs@example.co.uk first\nother@mail.com");

    expect(facts.email).toBe("dev+jobs@example.co.uk");
  });

  it("extracts phones in several formats and rejects dates", () => {
    expect(extractCvFacts("Call +1 (555) 123-4567 today").phone).toBe("+1 (555) 123-4567");
    expect(extractCvFacts("Tel: 0034 612345678").phone).toBe("0034 612345678");
    expect(extractCvFacts("Born 1990-05-12 and joined 2022-03-01").phone).toBeUndefined();
    expect(extractCvFacts("Worked 2019 - 2022 on things").phone).toBeUndefined();
  });

  it("reads the name from the first line and skips CV headers", () => {
    expect(extractCvFacts("María José Van der Berg\nemail@x.com").name).toBe(
      "María José Van der Berg",
    );
    expect(extractCvFacts("CURRICULUM VITAE\nJohn Doe").name).toBeUndefined();
    expect(extractCvFacts("Resume of Jane Roe\njane@x.com").name).toBeUndefined();
    expect(extractCvFacts("john.doe@x.com\n+1 555 000 111").name).toBeUndefined();
    expect(extractCvFacts("1. John Smith\nmore").name).toBeUndefined();
  });

  it("collects skills until the next section heading, across separators", () => {
    const facts = extractCvFacts(`Technical Skills:
React, Vue.js; Angular | Svelte
- Jest and Cypress
Node.js — expert

EXPERIENCE
Company`);
    expect(facts.skillNames).toEqual([
      "React",
      "Vue.js",
      "Angular",
      "Svelte",
      "Jest",
      "Cypress",
      "Node.js",
    ]);
  });

  it("returns empty facts for text without signals", () => {
    const facts = extractCvFacts("Just a wall of prose with no structure whatsoever.");

    expect(facts).toEqual({ email: undefined, phone: undefined, name: undefined, skillNames: [] });
  });
});

describe("buildFactsBlock", () => {
  it("renders only the facts that exist", () => {
    const block = buildFactsBlock({ email: "a@b.co", skillNames: ["TypeScript", "React"] });

    expect(block).toContain("Email: a@b.co");
    expect(block).toContain("TypeScript, React");
    expect(block).not.toContain("Name:");
    expect(block).not.toContain("Phone:");
  });
});
