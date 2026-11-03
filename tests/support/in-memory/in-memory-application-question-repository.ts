import type {
  ApplicationQuestionRepositoryPort,
  NewApplicationQuestion,
} from "@/application/ports/application-question-repository-port";
import type { ApplicationQuestion } from "@/domain/application/application-question";

export class InMemoryApplicationQuestionRepository implements ApplicationQuestionRepositoryPort {
  readonly items = new Map<string, ApplicationQuestion>();
  private sequence = 0;

  async listByApplication(applicationId: string): Promise<ApplicationQuestion[]> {
    return [...this.items.values()]
      .filter((item) => item.applicationId === applicationId)
      .toSorted((a, b) => a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getById(id: string): Promise<ApplicationQuestion | null> {
    return this.items.get(id) ?? null;
  }

  async add(
    applicationId: string,
    items: NewApplicationQuestion[],
  ): Promise<ApplicationQuestion[]> {
    const positions = [...this.items.values()]
      .filter((item) => item.applicationId === applicationId)
      .map((item) => item.position);
    let position = positions.length > 0 ? Math.max(...positions) + 1 : 0;
    const now = new Date();
    return items.map((item) => {
      this.sequence += 1;
      const question: ApplicationQuestion = {
        id: `q-${this.sequence}`,
        applicationId,
        question: item.question,
        answer: item.answer,
        position: position++,
        createdAt: now,
        updatedAt: now,
      };
      this.items.set(question.id, question);
      return question;
    });
  }

  async saveAnswer(id: string, answer: string): Promise<ApplicationQuestion> {
    const current = this.items.get(id);
    if (!current) {
      throw new Error(`ApplicationQuestion not found: ${id}`);
    }
    const updated: ApplicationQuestion = { ...current, answer, updatedAt: new Date() };
    this.items.set(id, updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    this.items.delete(id);
  }
}
