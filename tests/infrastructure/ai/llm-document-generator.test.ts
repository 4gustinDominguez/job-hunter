import { describe, expect, it } from "vitest";
import { DocumentGenerationError } from "@/application/errors";
import type { ChatClient, ChatResult, ChatTurn } from "@/infrastructure/ai/chat-client";
import { LlmDocumentGenerator } from "@/infrastructure/ai/llm-document-generator";
import type { JobAnalysis } from "@/domain/matching/job-analysis";
import { makeJob } from "../../support/make-job";
import { makeProfile } from "../../support/make-profile";

type FakeResponse = string | { content: string; truncated?: boolean } | Error;

class FakeChat implements ChatClient {
  readonly provider = "fake";
  readonly model = "fake-model";
  readonly turns: ChatTurn[][] = [];

  constructor(private readonly responses: FakeResponse[]) {}

  async complete(turns: ChatTurn[]): Promise<ChatResult> {
    this.turns.push(turns);
    const next = this.responses.shift();
    if (next === undefined) throw new Error("FakeChat: no response queued");
    if (next instanceof Error) throw next;
    if (typeof next === "string") return { content: next, truncated: false };
    return { content: next.content, truncated: next.truncated ?? false };
  }
}

const LETTER = `Dear Hiring team,

As a Senior Full Stack Developer at Nimbus SaaS I built the analytics dashboard with TypeScript and React, matching your need for a product engineer.

Kind regards,
Alex Morgan`;

const ANALYSIS: JobAnalysis = {
  classification: "POTENTIAL",
  matched: [{ skill: "React", status: "matched" }],
  gaps: ["Kubernetes"],
  unknowns: [],
  experience: [],
  location: [],
  salary: [],
  reasoning: "Core stack fits; platform gap is learnable.",
};

const JOB = makeJob({
  title: "Senior React Developer",
  description: "TypeScript, React and GraphQL for a SaaS platform.",
  company: { id: "c1", name: "Acme Software" },
});
const PROFILE = makeProfile();

describe("LlmDocumentGenerator", () => {
  it("returns the generated content and exposes provider/model", async () => {
    const chat = new FakeChat([LETTER]);
    const generator = new LlmDocumentGenerator(chat);

    const content = await generator.generate("COVER_LETTER", JOB, PROFILE);

    expect(content).toBe(LETTER);
    expect(generator.provider).toBe("fake");
    expect(generator.model).toBe("fake-model");
  });

  it("carries the anti-fabrication contract, profile and job facts in the prompt", async () => {
    const chat = new FakeChat([LETTER]);

    await new LlmDocumentGenerator(chat).generate("COVER_LETTER", JOB, PROFILE);

    const [system, user] = chat.turns[0] ?? [];
    expect(system?.content).toContain("Allowed:");
    expect(system?.content).toContain("Prohibited:");
    expect(system?.content).toContain("modify employment history");
    expect(system?.content).toContain("same language as the JOB");
    expect(system?.content).toContain("Hiring team");
    expect(user?.content).toContain("NAME: Alex Morgan");
    expect(user?.content).toContain("TypeScript (expert)");
    expect(user?.content).toContain("TITLE: Senior React Developer");
    expect(user?.content).toContain("Acme Software");
  });

  it("uses the tailored-CV contract for that kind", async () => {
    const chat = new FakeChat(["CONTACT\nalex@example.com"]);

    await new LlmDocumentGenerator(chat).generate("TAILORED_CV", JOB, PROFILE);

    const system = chat.turns[0]?.[0]?.content ?? "";
    expect(system).toContain("TAILORED CV");
    expect(system).toContain("Never drop a job from EXPERIENCE");
  });

  it("includes fit-analysis context when provided", async () => {
    const chat = new FakeChat([LETTER]);

    await new LlmDocumentGenerator(chat).generate("COVER_LETTER", JOB, PROFILE, ANALYSIS);

    expect(chat.turns[0]?.[1]?.content).toContain("FIT ANALYSIS");
    expect(chat.turns[0]?.[1]?.content).toContain("Kubernetes");
  });

  it("strips a single markdown fence around the document", async () => {
    const chat = new FakeChat(["```markdown\n" + LETTER + "\n```"]);

    const content = await new LlmDocumentGenerator(chat).generate("COVER_LETTER", JOB, PROFILE);

    expect(content).toBe(LETTER);
  });

  it("retries an empty response with feedback", async () => {
    const chat = new FakeChat(["   ", LETTER]);

    const content = await new LlmDocumentGenerator(chat).generate("COVER_LETTER", JOB, PROFILE);

    expect(content).toBe(LETTER);
    expect(chat.turns).toHaveLength(2);
    expect(chat.turns[1]?.[1]?.content).toContain("empty");
  });

  it("retries a truncated response with concise-and-complete feedback", async () => {
    const chat = new FakeChat([{ content: LETTER, truncated: true }, LETTER]);

    const content = await new LlmDocumentGenerator(chat).generate("COVER_LETTER", JOB, PROFILE);

    expect(content).toBe(LETTER);
    expect(chat.turns[1]?.[1]?.content).toContain("cut short");
  });

  it("gives up with DocumentGenerationError after two unusable attempts", async () => {
    const chat = new FakeChat([
      { content: "", truncated: false },
      { content: LETTER, truncated: true },
    ]);

    await expect(
      new LlmDocumentGenerator(chat).generate("COVER_LETTER", JOB, PROFILE),
    ).rejects.toThrowError(DocumentGenerationError);
    expect(chat.turns).toHaveLength(2);
  });

  it("wraps provider failures as DocumentGenerationError", async () => {
    const chat = new FakeChat([new Error("connection refused")]);

    await expect(
      new LlmDocumentGenerator(chat).generate("COVER_LETTER", JOB, PROFILE),
    ).rejects.toThrow(/AI provider request failed: connection refused/);
  });
});
