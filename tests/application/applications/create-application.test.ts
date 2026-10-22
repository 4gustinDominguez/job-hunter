import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError } from "@/application/errors";
import { CreateApplication } from "@/application/applications/create-application";
import { makeJob } from "../../support/make-job";
import { InMemoryApplicationRepository } from "../../support/in-memory/in-memory-application-repository";
import { InMemoryJobRepository } from "../../support/in-memory/in-memory-job-repository";

describe("CreateApplication", () => {
  let applications: InMemoryApplicationRepository;
  let jobs: InMemoryJobRepository;
  let useCase: CreateApplication;

  beforeEach(async () => {
    applications = new InMemoryApplicationRepository();
    jobs = new InMemoryJobRepository();
    useCase = new CreateApplication(applications, jobs);
    await jobs.save(makeJob({ id: "job-1" }), "company-1");
  });

  it("creates an application in DISCOVERED by default", async () => {
    const application = await useCase.run({ jobId: "job-1" });

    expect(application.status).toBe("DISCOVERED");
    expect(application.jobId).toBe("job-1");
    expect(applications.items.get(application.id)).toEqual(application);
  });

  it("allows registering an external application directly as APPLIED", async () => {
    const appliedAt = new Date("2026-10-19T08:00:00Z");

    const application = await useCase.run({ jobId: "job-1", status: "APPLIED", appliedAt });

    expect(application.status).toBe("APPLIED");
    expect(application.appliedAt).toEqual(appliedAt);
  });

  it("generates a unique id per application", async () => {
    const first = await useCase.run({ jobId: "job-1" });
    const second = await useCase.run({ jobId: "job-1" });

    expect(first.id).not.toBe(second.id);
    expect(applications.items.size).toBe(2);
  });

  it("persists contact, notes and document versions", async () => {
    const application = await useCase.run({
      jobId: "job-1",
      notes: ["Applied via website"],
      contact: { id: "contact-1", name: "Marta Ruiz", email: "marta@example.com" },
      cvVersion: "cv-2026-10",
      coverLetterVersion: "cl-2026-10",
    });

    expect(application.contact?.name).toBe("Marta Ruiz");
    expect(application.notes).toEqual(["Applied via website"]);
    expect(application.cvVersion).toBe("cv-2026-10");
    expect(application.coverLetterVersion).toBe("cl-2026-10");
  });

  it("throws NotFoundError when the job does not exist", async () => {
    await expect(useCase.run({ jobId: "missing-job" })).rejects.toThrow(NotFoundError);
    expect(applications.items.size).toBe(0);
  });
});
