import { beforeEach, describe, expect, it } from "vitest";
import { FindQuestionSimilarities } from "@/application/applications/find-question-similarities";
import { AnalysisError, NotFoundError, ValidationError } from "@/application/errors";
import type {
  QuestionSimilarityAnalyzerPort,
  SimilarQuestionCandidate,
} from "@/application/ports/question-similarity-analyzer-port";
import type { SimilarityMatch } from "@/domain/application/question-similarity";
import { InMemoryApplicationQuestionRepository } from "../../support/in-memory/in-memory-application-question-repository";
import { InMemoryQuestionSimilarityRepository } from "../../support/in-memory/in-memory-question-similarity-repository";

class FakeAnalyzer implements QuestionSimilarityAnalyzerPort {
  readonly provider = "fake-provider";
  readonly model = "fake-model";
  lastQuestion = "";
  lastCandidates: SimilarQuestionCandidate[] = [];
  matches: SimilarityMatch[] = [];
  error?: Error;

  async findSimilar(
    question: string,
    candidates: SimilarQuestionCandidate[],
  ): Promise<SimilarityMatch[]> {
    this.lastQuestion = question;
    this.lastCandidates = candidates;
    if (this.error) throw this.error;
    return this.matches;
  }
}

describe("FindQuestionSimilarities", () => {
  let questions: InMemoryApplicationQuestionRepository;
  let similarities: InMemoryQuestionSimilarityRepository;
  let analyzer: FakeAnalyzer;
  let useCase: FindQuestionSimilarities;

  beforeEach(async () => {
    questions = new InMemoryApplicationQuestionRepository();
    similarities = new InMemoryQuestionSimilarityRepository();
    analyzer = new FakeAnalyzer();
    useCase = new FindQuestionSimilarities(questions, similarities, analyzer);

    // Corpus: one answered question elsewhere, one answerless (excluded), one empty-answer.
    await questions.add("app-1", [
      { question: "Target question", answer: "Target answer" },
      { question: "Answerless sibling" },
    ]);
    await questions.add("app-2", [
      { question: "React experience?", answer: "5 years of React in production." },
      { question: "Hobbies?", answer: "   " },
    ]);
  });

  it("sends only answered questions (excluding the target) as candidates", async () => {
    analyzer.matches = [];

    await useCase.run("q-1");

    expect(analyzer.lastQuestion).toBe("Target question");
    expect(analyzer.lastCandidates.map((c) => c.id)).toEqual(["q-3"]);
    expect(analyzer.lastCandidates[0]!.answer).toBe("5 years of React in production.");
  });

  it("persists matches with provider and model", async () => {
    analyzer.matches = [{ questionId: "q-3", reason: "Both ask about React depth." }];

    const record = await useCase.run("q-1");

    expect(record.matches).toHaveLength(1);
    expect(record.provider).toBe("fake-provider");
    expect(record.model).toBe("fake-model");
    const stored = await similarities.getMany(["q-1"]);
    expect(stored.get("q-1")?.matches[0]?.questionId).toBe("q-3");
  });

  it("drops hallucinated ids that were not in the corpus", async () => {
    analyzer.matches = [
      { questionId: "q-3", reason: "real" },
      { questionId: "made-up-id", reason: "hallucinated" },
      { questionId: "q-1", reason: "self match" },
    ];

    const record = await useCase.run("q-1");

    expect(record.matches.map((m) => m.questionId)).toEqual(["q-3"]);
  });

  it("persists an empty match list as a valid 'nothing similar' result", async () => {
    analyzer.matches = [];

    const record = await useCase.run("q-1");

    expect(record.matches).toEqual([]);
    expect((await similarities.getMany(["q-1"])).has("q-1")).toBe(true);
  });

  it("overwrites a previous analysis on re-run", async () => {
    analyzer.matches = [{ questionId: "q-3", reason: "first run" }];
    await useCase.run("q-1");

    analyzer.matches = [];
    const record = await useCase.run("q-1");

    expect(record.matches).toEqual([]);
    expect((await similarities.getMany(["q-1"])).get("q-1")?.matches).toEqual([]);
  });

  it("rejects when there is no answered corpus", async () => {
    const lonely = new InMemoryApplicationQuestionRepository();
    await lonely.add("app-9", [{ question: "Only question, no answers" }]);
    const emptyUseCase = new FindQuestionSimilarities(lonely, similarities, analyzer);

    await expect(emptyUseCase.run("q-1")).rejects.toThrow(ValidationError);
    expect(analyzer.lastCandidates).toEqual([]);
  });

  it("rejects an unknown question", async () => {
    await expect(useCase.run("missing")).rejects.toThrow(NotFoundError);
  });

  it("wraps provider failures in AnalysisError", async () => {
    analyzer.error = new Error("ECONNREFUSED");

    await expect(useCase.run("q-1")).rejects.toThrow(AnalysisError);
    expect((await similarities.getMany(["q-1"])).size).toBe(0);
  });
});
