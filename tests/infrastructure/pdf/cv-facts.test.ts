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

  it("captures the whole summary section verbatim, joining PDF line-wraps", () => {
    const facts = extractCvFacts(`ABOUT ME
Senior Software Engineer | Full-Stack · React · Next.js
Senior Full-Stack Developer with 10+ years of experience building web applications, with
strong expertise in React, Next.js, TypeScript, Node.js and PHP. Currently focused on
modern frontend architectures while bringing extensive previous experience in backend.

Based in Spain, open to remote opportunities internationally.
WORK EXPERIENCE
Acme Corp`);
    expect(facts.summary).toBe(
      "Senior Software Engineer | Full-Stack · React · Next.js Senior Full-Stack Developer with 10+ years of experience building web applications, with strong expertise in React, Next.js, TypeScript, Node.js and PHP. Currently focused on modern frontend architectures while bringing extensive previous experience in backend. Based in Spain, open to remote opportunities internationally.",
    );
    expect(facts.headline).toBe("Senior Software Engineer | Full-Stack · React · Next.js");
  });

  it("does not treat plain prose as a headline and stops at a contact line", () => {
    const plain = extractCvFacts(`SUMMARY
Full stack developer with 8 years building SaaS products.

EXPERIENCE
Acme`);
    expect(plain.summary).toBe("Full stack developer with 8 years building SaaS products.");
    expect(plain.headline).toBeUndefined();

    const withContact = extractCvFacts(`PROFILE
Backend engineer specialised in payments.
Job preferences: Remote roles in fintech.
EXPERIENCE
Acme`);
    expect(withContact.summary).toBe("Backend engineer specialised in payments.");
  });

  it("keeps the opening parenthesis of parenthesised phones", () => {
    expect(extractCvFacts("Phone: (+34) 666165486").phone).toBe("(+34) 666165486");
  });
});

describe("buildFactsBlock", () => {
  it("renders only the facts that exist", () => {
    const block = buildFactsBlock({ email: "a@b.co", skillNames: ["TypeScript", "React"] });

    expect(block).toContain("Email: a@b.co");
    expect(block).toContain("TypeScript, React");
    expect(block).not.toContain("Name:");
    expect(block).not.toContain("Phone:");
    expect(block).not.toContain("Summary:");
  });

  it("renders summary and headline with the verbatim-copy instruction", () => {
    const block = buildFactsBlock({
      summary: "Senior Full-Stack Developer with 10+ years of experience. Based in Spain.",
      headline: "Senior Software Engineer | Full-Stack",
      skillNames: [],
    });

    expect(block).toContain("Summary (copy VERBATIM");
    expect(block).toContain("Based in Spain.");
    expect(block).toContain("Headline");
    expect(block).toContain("Senior Software Engineer | Full-Stack");
  });
});
