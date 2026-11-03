import { beforeEach, describe, expect, it } from "vitest";
import { AddApplicationQuestions } from "@/application/applications/add-application-questions";
import { NotFoundError, ValidationError } from "@/application/errors";
import type { Application } from "@/domain/application/application";
import { InMemoryApplicationRepository } from "../../support/in-memory/in-memory-application-repository";
import { InMemoryApplicationQuestionRepository } from "../../support/in-memory/in-memory-application-question-repository";

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: "app-1",
    jobId: "job-1",
    status: "INTERESTED",
    notes: [],
    ...overrides,
  };
}

describe("AddApplicationQuestions", () => {
  let applications: InMemoryApplicationRepository;
  let questions: InMemoryApplicationQuestionRepository;
  let useCase: AddApplicationQuestions;

  beforeEach(async () => {
    applications = new InMemoryApplicationRepository();
    questions = new InMemoryApplicationQuestionRepository();
    useCase = new AddApplicationQuestions(questions, applications);
    await applications.create(makeApplication());
  });

  it("adds questions and keeps them in insertion order", async () => {
    const added = await useCase.run("app-1", [
      { question: "Years of frontend experience?" },
      { question: "React production experience?", answer: "5 years" },
    ]);

    expect(added).toHaveLength(2);
    expect(added[0]!.position).toBe(0);
    expect(added[1]!.position).toBe(1);
    const stored = await questions.listByApplication("app-1");
    expect(stored.map((item) => item.question)).toEqual([
      "Years of frontend experience?",
      "React production experience?",
    ]);
  });

  it("appends after existing questions instead of restarting positions", async () => {
    await useCase.run("app-1", [{ question: "First" }]);

    const added = await useCase.run("app-1", [{ question: "Second" }]);

    expect(added[0]!.position).toBe(1);
    const stored = await questions.listByApplication("app-1");
    expect(stored.map((item) => item.question)).toEqual(["First", "Second"]);
  });

  it("trims input and drops fully empty rows", async () => {
    const added = await useCase.run("app-1", [
      { question: "  Padded question  ", answer: "  Padded answer  " },
      { question: "   ", answer: undefined },
    ]);

    expect(added).toHaveLength(1);
    expect(added[0]!.question).toBe("Padded question");
    expect(added[0]!.answer).toBe("Padded answer");
  });

  it("rejects an answer without a question", async () => {
    await expect(useCase.run("app-1", [{ question: "", answer: "orphan answer" }])).rejects.toThrow(
      ValidationError,
    );
    expect(await questions.listByApplication("app-1")).toHaveLength(0);
  });

  it("rejects when no row has content", async () => {
    await expect(useCase.run("app-1", [{ question: "  " }])).rejects.toThrow(
      "Add at least one question.",
    );
  });

  it("rejects an unknown application", async () => {
    await expect(useCase.run("nope", [{ question: "Q?" }])).rejects.toThrow(NotFoundError);
  });
});
