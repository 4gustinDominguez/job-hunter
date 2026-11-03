import { NotFoundError, ValidationError } from "@/application/errors";
import type { ApplicationQuestionRepositoryPort } from "@/application/ports/application-question-repository-port";
import type { ApplicationQuestion } from "@/domain/application/application-question";

export class SaveApplicationQuestionAnswer {
  constructor(private readonly questions: ApplicationQuestionRepositoryPort) {}

  async run(questionId: string, answer: string): Promise<ApplicationQuestion> {
    const trimmed = answer.trim();
    if (trimmed === "") {
      throw new ValidationError("answer", "Answer cannot be empty.");
    }
    const question = await this.questions.getById(questionId);
    if (!question) {
      throw new NotFoundError("ApplicationQuestion", questionId);
    }
    return this.questions.saveAnswer(questionId, trimmed);
  }
}
