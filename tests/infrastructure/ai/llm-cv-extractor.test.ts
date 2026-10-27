import { describe, expect, it } from "vitest";
import { CvExtractionError } from "@/application/errors";
import type { ChatClient, ChatResult, ChatTurn } from "@/infrastructure/ai/chat-client";
import { LlmCvExtractor } from "@/infrastructure/ai/llm-cv-extractor";

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

const CV_TEXT =
  "Alex Morgan CV. Senior developer with TypeScript and React. Experience at Nimbus SaaS from 2022.";

const DRAFT_JSON = JSON.stringify({
  name: "Alex Morgan",
  email: "alex@example.com",
  experience: [
    {
      company: "Nimbus SaaS",
      position: "Senior Developer",
      startDate: "2022-03-01",
      description: "Product team",
      achievements: [],
      skills: ["TypeScript"],
    },
  ],
  skills: [{ name: "TypeScript", category: "PROGRAMMING", level: "EXPERT" }],
  projects: [],
  education: [],
  preferences: { desiredRoles: ["Senior Developer"] },
});

const readText = async (): Promise<string> => CV_TEXT;

function extractorWith(chat: FakeChat, read: () => Promise<string> = readText) {
  return new LlmCvExtractor(chat, read);
}

describe("LlmCvExtractor", () => {
  it("extracts a profile from a valid JSON response", async () => {
    const chat = new FakeChat([DRAFT_JSON]);

    const draft = await extractorWith(chat).extract(new Uint8Array([1, 2, 3]));

    expect(draft.name).toBe("Alex Morgan");
    expect(draft.email).toBe("alex@example.com");
    expect(draft.id).toBeUndefined();
    expect(draft.experience[0]?.startDate).toBeInstanceOf(Date);
    expect(draft.experience[0]?.id).toBeTruthy();
    expect(draft.skills[0]?.id).toBeTruthy();
    expect(draft.preferences.remotePreference).toBe("ANY");
    expect(draft.preferences.employmentTypes).toEqual([]);
  });

  it("accepts markdown-fenced and prose-wrapped JSON", async () => {
    const chat = new FakeChat([
      `Here you go:\n\`\`\`json\n${DRAFT_JSON}\n\`\`\`\nHope this helps!`,
    ]);

    const draft = await extractorWith(chat).extract(new Uint8Array([1]));

    expect(draft.name).toBe("Alex Morgan");
    expect(chat.turns).toHaveLength(1);
  });

  it("drops CV category headings from the extracted skills", async () => {
    const chat = new FakeChat([
      JSON.stringify({
        ...JSON.parse(DRAFT_JSON),
        skills: [
          { name: "Frontend", category: "FRAMEWORK", level: "INTERMEDIATE" },
          { name: "  backend ", category: "TOOL", level: "INTERMEDIATE" },
          { name: "Testing", category: "TOOL", level: "INTERMEDIATE" },
          { name: "Tools", category: "TOOL", level: "INTERMEDIATE" },
          { name: "React", category: "FRAMEWORK", level: "EXPERT" },
          { name: "Clean Architecture", category: "PROGRAMMING", level: "ADVANCED" },
        ],
      }),
    ]);

    const draft = await extractorWith(chat).extract(new Uint8Array([1]));

    expect(draft.skills.map((skill) => skill.name)).toEqual(["React", "Clean Architecture"]);
    expect(chat.turns[0]?.[0]?.content).toContain("category labels");
  });

  it("retries once with feedback when the first response is invalid", async () => {
    const chat = new FakeChat(["not json at all", DRAFT_JSON]);

    const draft = await extractorWith(chat).extract(new Uint8Array([1]));

    expect(draft.name).toBe("Alex Morgan");
    expect(chat.turns).toHaveLength(2);
    expect(chat.turns[1]?.[1]?.content).toContain("was invalid");
    expect(chat.turns[1]?.[1]?.content).toContain("not valid JSON");
  });

  it("throws CvExtractionError when both attempts are invalid", async () => {
    const chat = new FakeChat(["garbage", '{"name": 42}']);

    await expect(extractorWith(chat).extract(new Uint8Array([1]))).rejects.toThrow(
      CvExtractionError,
    );
    expect(chat.turns).toHaveLength(2);
  });

  it("retries a truncated response with cut-short feedback", async () => {
    const chat = new FakeChat([{ content: DRAFT_JSON.slice(0, 180), truncated: true }, DRAFT_JSON]);

    const draft = await extractorWith(chat).extract(new Uint8Array([1]));

    expect(draft.name).toBe("Alex Morgan");
    expect(chat.turns).toHaveLength(2);
    expect(chat.turns[1]?.[1]?.content).toContain("cut short");
  });

  it("accepts a complete response even when the provider flagged truncation", async () => {
    const chat = new FakeChat([{ content: DRAFT_JSON, truncated: true }]);

    const draft = await extractorWith(chat).extract(new Uint8Array([1]));

    expect(draft.name).toBe("Alex Morgan");
    expect(chat.turns).toHaveLength(1);
  });

  it("retries when a CV with a skills section comes back without skills", async () => {
    const emptySkills = JSON.stringify({
      ...JSON.parse(DRAFT_JSON),
      skills: [],
    });
    const cvWithSkillsSection = `${CV_TEXT}\n\nSKILLS\nTypeScript, React`;
    const chat = new FakeChat([emptySkills, DRAFT_JSON]);

    const draft = await extractorWith(chat, async () => cvWithSkillsSection).extract(
      new Uint8Array([1]),
    );

    expect(draft.skills.length).toBeGreaterThan(0);
    expect(chat.turns).toHaveLength(2);
    expect(chat.turns[1]?.[1]?.content).toContain("came back empty");
  });

  it("throws when the PDF has no selectable text", async () => {
    const chat = new FakeChat([DRAFT_JSON]);

    await expect(
      extractorWith(chat, async () => "   ").extract(new Uint8Array([1])),
    ).rejects.toThrow(/No selectable text/);
    expect(chat.turns).toHaveLength(0);
  });

  it("throws when the PDF cannot be read", async () => {
    const chat = new FakeChat([DRAFT_JSON]);

    await expect(
      extractorWith(chat, async () => {
        throw new Error("bad pdf");
      }).extract(new Uint8Array([1])),
    ).rejects.toThrow(/Could not read the PDF/);
  });

  it("wraps AI provider failures into CvExtractionError", async () => {
    const chat = new FakeChat([new Error("connection refused")]);

    await expect(extractorWith(chat).extract(new Uint8Array([1]))).rejects.toThrow(
      /AI provider request failed: connection refused/,
    );
  });

  it("sends the anti-fabrication prompt and the CV text", async () => {
    const chat = new FakeChat([DRAFT_JSON]);

    await extractorWith(chat).extract(new Uint8Array([1]));

    const turns = chat.turns[0] ?? [];
    expect(turns[0]?.role).toBe("system");
    expect(turns[0]?.content).toContain("ONLY facts explicitly present");
    expect(turns[0]?.content).toContain("CV's original language");
    expect(turns[0]?.content).toContain('"institution"');
    expect(turns[0]?.content).toContain("PROGRAMMING");
    expect(turns[1]?.content).toContain(CV_TEXT);
  });

  it("injects the deterministic facts block into the prompt", async () => {
    const cv = `${CV_TEXT}\ncontact: alex.morgan@example.com · +1 (555) 987-6543\n\nSKILLS\nTypeScript, React, Node.js\n\nEXPERIENCE\nNimbus`;
    const chat = new FakeChat([DRAFT_JSON]);

    await extractorWith(chat, async () => cv).extract(new Uint8Array([1]));

    const prompt = chat.turns[0]?.[1]?.content ?? "";
    expect(prompt).toContain("EXTRACTED FACTS");
    expect(prompt).toContain("Email: alex.morgan@example.com");
    expect(prompt).toContain("Phone: +1 (555) 987-6543");
    expect(prompt).toContain("TypeScript, React, Node.js");
  });

  it("facts always win over the model for contact fields", async () => {
    const cv =
      "Alex Morgan\nalex.facts@example.com · +34 600 111 222\n\nSKILLS\nTypeScript\n\nEXPERIENCE\nNimbus";
    const modelDraft = JSON.stringify({
      ...JSON.parse(DRAFT_JSON),
      name: "Alex Model",
      email: "alex.model@example.com",
      phone: "+1 555 000 000",
    });
    const chat = new FakeChat([modelDraft]);

    const draft = await extractorWith(chat, async () => cv).extract(new Uint8Array([1]));

    expect(draft.name).toBe("Alex Morgan");
    expect(draft.email).toBe("alex.facts@example.com");
    expect(draft.phone).toBe("+34 600 111 222");
  });

  it("facts summary wins when the model shortens it to one sentence", async () => {
    const cv = `ABOUT ME
Senior Software Engineer | Full-Stack · React
Senior Full-Stack Developer with 10+ years of experience building web applications.
Currently focused on modern frontend architectures while bringing backend experience.
Based in Spain, open to remote opportunities internationally.
WORK EXPERIENCE
Nimbus`;
    const shortSummary = JSON.stringify({
      ...JSON.parse(DRAFT_JSON),
      summary:
        "Senior Full-Stack Developer with 10+ years of experience building web applications.",
    });
    const chat = new FakeChat([shortSummary]);

    const draft = await extractorWith(chat, async () => cv).extract(new Uint8Array([1]));

    expect(draft.summary).toBe(
      "Senior Software Engineer | Full-Stack · React Senior Full-Stack Developer with 10+ years of experience building web applications. Currently focused on modern frontend architectures while bringing backend experience. Based in Spain, open to remote opportunities internationally.",
    );
    const prompt = chat.turns[0]?.[1]?.content ?? "";
    expect(prompt).toContain("copy VERBATIM as the profile summary");
    expect(prompt).toContain("desiredRoles follow this");
  });

  it("falls back to the model's contact fields when the CV has no facts", async () => {
    const cv = "A prose CV with no first-line name and no contact details at all.";
    const chat = new FakeChat([DRAFT_JSON]);

    const draft = await extractorWith(chat, async () => cv).extract(new Uint8Array([1]));

    expect(draft.name).toBe("Alex Morgan");
    expect(draft.email).toBe("alex@example.com");
  });

  it("retries when the facts skills list comes back uncategorized", async () => {
    const cv = `${CV_TEXT}\n\nSKILLS\nTypeScript, React\n\nEXPERIENCE\nNimbus`;
    const emptySkills = JSON.stringify({ ...JSON.parse(DRAFT_JSON), skills: [] });
    const chat = new FakeChat([emptySkills, DRAFT_JSON]);

    const draft = await extractorWith(chat, async () => cv).extract(new Uint8Array([1]));

    expect(draft.skills.length).toBeGreaterThan(0);
    expect(chat.turns).toHaveLength(2);
    expect(chat.turns[1]?.[1]?.content).toContain("EXTRACTED FACTS");
    expect(chat.turns[1]?.[1]?.content).toContain("skills list");
  });
});
