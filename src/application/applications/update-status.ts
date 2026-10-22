import { InvalidStatusTransitionError, NotFoundError } from "@/application/errors";
import type { ApplicationRepositoryPort } from "@/application/ports/application-repository-port";
import { canTransition } from "@/domain/application/status-machine";
import type { Application } from "@/domain/application/application";
import type { ApplicationStatus } from "@/domain/application/enums";

export interface UpdateStatusOptions {
  note?: string;
  nextActionAt?: Date;
}

export class UpdateStatus {
  constructor(private readonly applications: ApplicationRepositoryPort) {}

  async run(
    id: string,
    next: ApplicationStatus,
    options: UpdateStatusOptions = {},
  ): Promise<Application> {
    const current = await this.applications.getById(id);
    if (!current) {
      throw new NotFoundError("Application", id);
    }
    if (current.status !== next && !canTransition(current.status, next)) {
      throw new InvalidStatusTransitionError(current.status, next);
    }
    const hasPatch = options.note !== undefined || options.nextActionAt !== undefined;
    if (current.status === next && !hasPatch) {
      return current;
    }
    const patch: { appliedAt?: Date; note?: string; nextActionAt?: Date } = {};
    if (next === "APPLIED" && !current.appliedAt) {
      patch.appliedAt = new Date();
    }
    if (options.note !== undefined) {
      patch.note = options.note;
    }
    if (options.nextActionAt !== undefined) {
      patch.nextActionAt = options.nextActionAt;
    }
    return this.applications.updateStatus(id, next, patch);
  }
}
