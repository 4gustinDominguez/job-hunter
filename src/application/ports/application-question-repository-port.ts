import type { ApplicationQuestion } from "@/domain/application/application-question";

export interface NewApplicationQuestion {
  question: string;
  answer?: string;
}

export interface ApplicationQuestionRepositoryPort {
  listByApplication(applicationId: string): Promise<ApplicationQuestion[]>;
  getById(id: string): Promise<ApplicationQuestion | null>;
  /** Appends items after the application's current last position, in array order. */
  add(applicationId: string, items: NewApplicationQuestion[]): Promise<ApplicationQuestion[]>;
  saveAnswer(id: string, answer: string): Promise<ApplicationQuestion>;
  remove(id: string): Promise<void>;
}
