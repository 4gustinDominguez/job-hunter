import type { JobSourceType } from "@/domain/job/enums";

export class JobSourceError extends Error {
  constructor(
    readonly sourceType: JobSourceType,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "JobSourceError";
  }
}
