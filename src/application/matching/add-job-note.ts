import type { JobRepositoryPort } from "@/application/ports/job-repository-port";
import { NotFoundError, ValidationError } from "@/application/errors";

export class AddJobNote {
  constructor(private readonly jobs: JobRepositoryPort) {}

  async run(jobId: string, note: string): Promise<string[]> {
    const trimmed = note.trim();
    if (trimmed === "") {
      throw new ValidationError("note", "Note cannot be empty.");
    }
    const job = await this.jobs.getById(jobId);
    if (!job) {
      throw new NotFoundError("Job", jobId);
    }
    const notes = [...(job.notes ?? []), trimmed];
    await this.jobs.updateNotes(jobId, notes);
    return notes;
  }
}
