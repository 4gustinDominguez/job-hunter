import { NotFoundError, ValidationError } from "@/application/errors";
import type { ApplicationRepositoryPort } from "@/application/ports/application-repository-port";
import type {
  ApplicationQuestionRepositoryPort,
  NewApplicationQuestion,
} from "@/application/ports/application-question-repository-port";
import type { ApplicationQuestion } from "@/domain/application/application-question";

export class AddApplicationQuestions {
  constructor(
    private readonly questions: ApplicationQuestionRepositoryPort,
    private readonly applications: ApplicationRepositoryPort,
  ) {}

  async run(
    applicationId: string,
    items: NewApplicationQuestion[],
  ): Promise<ApplicationQuestion[]> {
    const application = await this.applications.getById(applicationId);
    if (!application) {
      throw new NotFoundError("Application", applicationId);
    }
    const cleaned = items.map((item) => ({
      question: item.question.trim(),
      answer: item.answer?.trim() || undefined,
    }));
    const meaningful = cleaned.filter((item) => item.question !== "" || item.answer !== undefined);
    if (meaningful.length === 0) {
      throw new ValidationError("question", "Add at least one question.");
    }
    if (meaningful.some((item) => item.question === "")) {
      throw new ValidationError("question", "Every answer needs its question.");
    }
    return this.questions.add(applicationId, meaningful);
  }
}
