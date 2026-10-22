import type { Application } from "@/domain/application/application";
import type { ApplicationStatus } from "@/domain/application/enums";

export interface ApplicationRepositoryPort {
  getById(id: string): Promise<Application | null>;
  list(): Promise<Application[]>;
  create(application: Application): Promise<Application>;
  updateStatus(
    id: string,
    status: ApplicationStatus,
    patch?: { appliedAt?: Date; note?: string; nextActionAt?: Date },
  ): Promise<Application>;
}
