import { describe, expect, it } from "vitest";
import { AnalysisError } from "@/application/errors";
import type { ChatClient, ChatResult, ChatTurn } from "@/infrastructure/ai/chat-client";
import { LlmJobMatcher } from "@/infrastructure/ai/llm-job-matcher";
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
    if (next === undefined) {
      throw new Error("FakeChat: no response queued");
    }
    if (next instanceof Error) {
      throw next;
    }
    if (typeof next === "string") {
      return { content: next, truncated: false };
    }
    return { content: next.content, truncated: next.truncated ?? false };
  }
}

const ANALYSIS_JSON = JSON.stringify({
  classification: "STRONG",
  matched: [
    { skill: "TypeScript", candidateLevel: "EXPERT", requiredLevel: "ADVANCED", status: "matched" },
  ],
  gaps: ["Kubernetes"],
  unknowns: ["No seniority stated"],
  experience: ["5y full-stack aligns"],
  location: ["Remote compatible"],
  salary: ["Not stated in the job"],
  reasoning: "Core stack matches; one learnable gap.",
});

const JOB = makeJob({
  title: "Senior Full Stack Developer",
  description: "TypeScript, React and Node.js for a SaaS platform.",
});
const PROFILE = makeProfile();

describe("LlmJobMatcher", () => {
  it("parses a valid analysis and exposes provider/model", async () => {
    const chat = new FakeChat([ANALYSIS_JSON]);
    const matcher = new LlmJobMatcher(chat);

    const analysis = await matcher.analyze(JOB, PROFILE);

    expect(analysis.classification).toBe("STRONG");
    expect(analysis.matched[0]?.skill).toBe("TypeScript");
    expect(analysis.gaps).toEqual(["Kubernetes"]);
    expect(matcher.provider).toBe("fake");
    expect(matcher.model).toBe("fake-model");
  });

  it("sends job + profile facts and the anti-fabrication contract in the prompt", async () => {
    const chat = new FakeChat([ANALYSIS_JSON]);

    await new LlmJobMatcher(chat).analyze(JOB, PROFILE);

    const [system, user] = chat.turns[0] ?? [];
    expect(system?.content).toContain("Never invent");
    expect(system?.content).toContain("STRONG");
    expect(user?.content).toContain("Senior Full Stack Developer");
    expect(user?.content).toContain("TypeScript");
    expect(user?.content).toContain("TypeScript (expert)");
    expect(user?.content).toContain("55000");
  });

  it("retries after invalid JSON with the issue as feedback", async () => {
    const chat = new FakeChat(["not json at all", ANALYSIS_JSON]);
    const matcher = new LlmJobMatcher(chat);

    const analysis = await matcher.analyze(JOB, PROFILE);

    expect(analysis.classification).toBe("STRONG");
    expect(chat.turns).toHaveLength(2);
    expect(chat.turns[1]?.[1]?.content).toContain("not valid JSON");
  });

  it("retries when the schema rejects the payload", async () => {
    const badSchema = JSON.stringify({ classification: "AMAZING", reasoning: "x" });
    const chat = new FakeChat([badSchema, ANALYSIS_JSON]);

    const analysis = await new LlmJobMatcher(chat).analyze(JOB, PROFILE);

    expect(analysis.classification).toBe("STRONG");
    expect(chat.turns).toHaveLength(2);
    expect(chat.turns[1]?.[1]?.content).toContain("does not match the schema");
  });

  it("normalizes classification aliases and casing", async () => {
    const aliased = JSON.stringify({
      classification: "strong_match",
      matched: [],
      gaps: [],
      unknowns: [],
      experience: [],
      location: [],
      salary: [],
      reasoning: "Alias case.",
    });

    const analysis = await new LlmJobMatcher(new FakeChat([aliased])).analyze(JOB, PROFILE);

    expect(analysis.classification).toBe("STRONG");
  });

  it("coerces sloppy skill levels before schema validation", async () => {
    const sloppyLevels = JSON.stringify({
      classification: "POTENTIAL",
      matched: [
        { skill: "TypeScript", candidateLevel: "senior", requiredLevel: "mid", status: "MATCHED" },
        { skill: "Next.js", candidateLevel: "EXPERT", requiredLevel: "UNKNOWN", status: "matched" },
      ],
      gaps: [],
      unknowns: [],
      experience: [],
      location: [],
      salary: [],
      reasoning: "Levels were sloppy.",
    });

    const analysis = await new LlmJobMatcher(new FakeChat([sloppyLevels])).analyze(JOB, PROFILE);

    expect(analysis.matched[0]).toEqual({
      skill: "TypeScript",
      candidateLevel: "ADVANCED",
      requiredLevel: "INTERMEDIATE",
      status: "matched",
    });
    expect(analysis.matched[1]).toEqual({
      skill: "Next.js",
      candidateLevel: "EXPERT",
      status: "matched",
    });
  });

  it("gives up with AnalysisError after two failed attempts", async () => {
    const chat = new FakeChat(["garbage", { content: "still garbage", truncated: true }]);
    const matcher = new LlmJobMatcher(chat);

    await expect(matcher.analyze(JOB, PROFILE)).rejects.toThrowError(AnalysisError);
    expect(chat.turns).toHaveLength(2);
  });

  it("wraps provider failures as AnalysisError", async () => {
    const chat = new FakeChat([new Error("fetch failed")]);

    await expect(new LlmJobMatcher(chat).analyze(JOB, PROFILE)).rejects.toThrow(
      /AI provider request failed/,
    );
  });

  it("accepts fenced markdown output", async () => {
    const fenced = "```json\n" + ANALYSIS_JSON + "\n```";

    const analysis = await new LlmJobMatcher(new FakeChat([fenced])).analyze(JOB, PROFILE);

    expect(analysis.classification).toBe("STRONG");
  });
});
