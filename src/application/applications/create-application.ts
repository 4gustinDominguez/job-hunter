import { NotFoundError } from "@/application/errors";
import type { ApplicationRepositoryPort } from "@/application/ports/application-repository-port";
import type { JobRepositoryPort } from "@/application/ports/job-repository-port";
import { APPLICATION_STATUSES } from "@/domain/application/enums";
import type { Application } from "@/domain/application/application";
import type { ApplicationStatus } from "@/domain/application/enums";
import type { Contact } from "@/domain/application/contact";

export interface CreateApplicationInput {
  jobId: string;
  status?: ApplicationStatus;
  contact?: Contact;
  notes?: string[];
  appliedAt?: Date;
  cvVersion?: string;
  coverLetterVersion?: string;
  emailVersion?: string;
}

export class CreateApplication {
  constructor(
    private readonly applications: ApplicationRepositoryPort,
    private readonly jobs: JobRepositoryPort,
  ) {}

  async run(input: CreateApplicationInput): Promise<Application> {
    const job = await this.jobs.getById(input.jobId);
    if (!job) {
      throw new NotFoundError("Job", input.jobId);
    }
    const application: Application = {
      id: crypto.randomUUID(),
      jobId: input.jobId,
      status: input.status ?? APPLICATION_STATUSES[0],
      appliedAt: input.appliedAt,
      cvVersion: input.cvVersion,
      coverLetterVersion: input.coverLetterVersion,
      emailVersion: input.emailVersion,
      contact: input.contact,
      notes: input.notes,
      nextActionAt: undefined,
    };
    return this.applications.create(application);
  }
}
