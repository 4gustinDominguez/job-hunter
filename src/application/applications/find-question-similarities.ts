import { AnalysisError, NotFoundError, ValidationError } from "@/application/errors";
import type { ApplicationQuestionRepositoryPort } from "@/application/ports/application-question-repository-port";
import type { QuestionSimilarityAnalyzerPort } from "@/application/ports/question-similarity-analyzer-port";
import type { QuestionSimilarityRepositoryPort } from "@/application/ports/question-similarity-repository-port";
import type { QuestionSimilarityRecord } from "@/domain/application/question-similarity";

/** Cap on the corpus sent to the model — keeps the prompt bounded as history grows. */
const CORPUS_LIMIT = 150;

export class FindQuestionSimilarities {
  constructor(
    private readonly questions: ApplicationQuestionRepositoryPort,
    private readonly similarities: QuestionSimilarityRepositoryPort,
    private readonly analyzer: QuestionSimilarityAnalyzerPort,
  ) {}

  async run(questionId: string): Promise<QuestionSimilarityRecord> {
    const question = await this.questions.getById(questionId);
    if (!question) {
      throw new NotFoundError("ApplicationQuestion", questionId);
    }
    const candidates = await this.questions.listAnswered(questionId, CORPUS_LIMIT);
    if (candidates.length === 0) {
      throw new ValidationError(
        "candidates",
        "No previous answered questions to compare against yet.",
      );
    }

    const matches = await this.analyzer
      .findSimilar(
        question.question,
        candidates.map((item) => ({
          id: item.id,
          question: item.question,
          answer: item.answer ?? "",
        })),
      )
      .catch((error: unknown) => {
        if (error instanceof ValidationError || error instanceof AnalysisError) {
          throw error;
        }
        throw new AnalysisError(
          `AI provider request failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      });

    // The model may hallucinate ids — only keep candidates we actually sent.
    const candidateIds = new Set(candidates.map((item) => item.id));
    const validMatches = matches.filter(
      (match) => candidateIds.has(match.questionId) && match.questionId !== questionId,
    );

    const record: Omit<QuestionSimilarityRecord, "questionId"> = {
      matches: validMatches,
      provider: this.analyzer.provider,
      model: this.analyzer.model,
      createdAt: new Date(),
    };
    await this.similarities.save(questionId, record);
    return { questionId, ...record };
  }
}
