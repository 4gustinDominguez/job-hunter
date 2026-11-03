import { NotFoundError } from "@/application/errors";
import type { ApplicationQuestionRepositoryPort } from "@/application/ports/application-question-repository-port";

export class DeleteApplicationQuestion {
  constructor(private readonly questions: ApplicationQuestionRepositoryPort) {}

  async run(questionId: string): Promise<void> {
    const question = await this.questions.getById(questionId);
    if (!question) {
      throw new NotFoundError("ApplicationQuestion", questionId);
    }
    await this.questions.remove(questionId);
  }
}
