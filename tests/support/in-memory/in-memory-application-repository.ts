import { NotFoundError } from "@/application/errors";
import type { ApplicationRepositoryPort } from "@/application/ports/application-repository-port";
import type { Application } from "@/domain/application/application";
import type { ApplicationStatus } from "@/domain/application/enums";

export class InMemoryApplicationRepository implements ApplicationRepositoryPort {
  readonly items = new Map<string, Application>();

  async getById(id: string): Promise<Application | null> {
    return this.items.get(id) ?? null;
  }

  async list(): Promise<Application[]> {
    return [...this.items.values()];
  }

  async create(application: Application): Promise<Application> {
    this.items.set(application.id, application);
    return application;
  }

  async updateStatus(
    id: string,
    status: ApplicationStatus,
    patch?: { appliedAt?: Date; note?: string; nextActionAt?: Date },
  ): Promise<Application> {
    const current = this.items.get(id);
    if (!current) {
      throw new NotFoundError("Application", id);
    }
    const updated: Application = {
      ...current,
      status,
      appliedAt: patch?.appliedAt ?? current.appliedAt,
      nextActionAt: patch?.nextActionAt ?? current.nextActionAt,
      notes: patch?.note ? [...(current.notes ?? []), patch.note] : current.notes,
    };
    this.items.set(id, updated);
    return updated;
  }
}
