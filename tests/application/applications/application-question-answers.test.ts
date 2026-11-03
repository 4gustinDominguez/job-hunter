import { beforeEach, describe, expect, it } from "vitest";
import { DeleteApplicationQuestion } from "@/application/applications/delete-application-question";
import { SaveApplicationQuestionAnswer } from "@/application/applications/save-application-question-answer";
import { NotFoundError, ValidationError } from "@/application/errors";
import { InMemoryApplicationQuestionRepository } from "../../support/in-memory/in-memory-application-question-repository";

describe("SaveApplicationQuestionAnswer", () => {
  let questions: InMemoryApplicationQuestionRepository;
  let useCase: SaveApplicationQuestionAnswer;

  beforeEach(async () => {
    questions = new InMemoryApplicationQuestionRepository();
    useCase = new SaveApplicationQuestionAnswer(questions);
    await questions.add("app-1", [{ question: "Years of experience?" }]);
  });

  it("saves a trimmed answer", async () => {
    const updated = await useCase.run("q-1", "  5 years  ");

    expect(updated.answer).toBe("5 years");
    expect((await questions.getById("q-1"))?.answer).toBe("5 years");
  });

  it("rejects an empty answer", async () => {
    await expect(useCase.run("q-1", "   ")).rejects.toThrow(ValidationError);
    expect((await questions.getById("q-1"))?.answer).toBeUndefined();
  });

  it("rejects an unknown question", async () => {
    await expect(useCase.run("missing", "answer")).rejects.toThrow(NotFoundError);
  });
});

describe("DeleteApplicationQuestion", () => {
  let questions: InMemoryApplicationQuestionRepository;
  let useCase: DeleteApplicationQuestion;

  beforeEach(async () => {
    questions = new InMemoryApplicationQuestionRepository();
    useCase = new DeleteApplicationQuestion(questions);
    await questions.add("app-1", [{ question: "To delete" }]);
  });

  it("removes the question", async () => {
    await useCase.run("q-1");

    expect(await questions.getById("q-1")).toBeNull();
    expect(await questions.listByApplication("app-1")).toHaveLength(0);
  });

  it("rejects an unknown question", async () => {
    await expect(useCase.run("missing")).rejects.toThrow(NotFoundError);
  });
});
