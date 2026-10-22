import { beforeEach, describe, expect, it } from "vitest";
import { AddJobNote } from "@/application/matching/add-job-note";
import { NotFoundError, ValidationError } from "@/application/errors";
import { InMemoryJobRepository } from "../../support/in-memory/in-memory-job-repository";
import { makeJob } from "../../support/make-job";

describe("AddJobNote", () => {
  let jobs: InMemoryJobRepository;
  let useCase: AddJobNote;

  beforeEach(async () => {
    jobs = new InMemoryJobRepository();
    useCase = new AddJobNote(jobs);
  });

  it("appends a note, preserving order", async () => {
    const job = makeJob();
    await jobs.save(job, "company-1");

    await useCase.run(job.id, "First thought");
    await useCase.run(job.id, "Second thought");

    const stored = await jobs.getById(job.id);
    expect(stored?.notes).toEqual(["First thought", "Second thought"]);
  });

  it("trims the note and rejects empty ones", async () => {
    const job = makeJob();
    await jobs.save(job, "company-1");

    await expect(useCase.run(job.id, "  ")).rejects.toThrowError(ValidationError);
    await useCase.run(job.id, "  trimmed  ");
    const stored = await jobs.getById(job.id);
    expect(stored?.notes).toEqual(["trimmed"]);
  });

  it("fails with NotFoundError for an unknown job", async () => {
    await expect(useCase.run("missing", "note")).rejects.toThrowError(NotFoundError);
  });
});
