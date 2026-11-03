import type { ApplicationQuestion } from "@/domain/application/application-question";

export interface NewApplicationQuestion {
  question: string;
  answer?: string;
}

export interface ApplicationQuestionRepositoryPort {
  listByApplication(applicationId: string): Promise<ApplicationQuestion[]>;
  getById(id: string): Promise<ApplicationQuestion | null>;
  getMany(ids: string[]): Promise<ApplicationQuestion[]>;
  /** Appends items after the application's current last position, in array order. */
  add(applicationId: string, items: NewApplicationQuestion[]): Promise<ApplicationQuestion[]>;
  saveAnswer(id: string, answer: string): Promise<ApplicationQuestion>;
  remove(id: string): Promise<void>;
  /**
   * Answered questions across ALL applications (the reusable-experience
   * corpus), optionally excluding one id, most recent first. Answerless
   * questions carry no experience and are left out.
   */
  listAnswered(excludeQuestionId?: string, limit?: number): Promise<ApplicationQuestion[]>;
}
