import { beforeEach, describe, expect, it } from "vitest";
import { InvalidStatusTransitionError, NotFoundError } from "@/application/errors";
import { UpdateStatus } from "@/application/applications/update-status";
import type { Application } from "@/domain/application/application";
import { InMemoryApplicationRepository } from "../../support/in-memory/in-memory-application-repository";

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: "app-1",
    jobId: "job-1",
    status: "DISCOVERED",
    notes: [],
    ...overrides,
  };
}

describe("UpdateStatus", () => {
  let applications: InMemoryApplicationRepository;
  let useCase: UpdateStatus;

  beforeEach(() => {
    applications = new InMemoryApplicationRepository();
    useCase = new UpdateStatus(applications);
  });

  async function seed(overrides: Partial<Application> = {}): Promise<Application> {
    return applications.create(makeApplication(overrides));
  }

  it("applies a legal transition", async () => {
    await seed();

    const updated = await useCase.run("app-1", "INTERESTED");

    expect(updated.status).toBe("INTERESTED");
    expect(applications.items.get("app-1")?.status).toBe("INTERESTED");
  });

  it("rejects an illegal transition", async () => {
    await seed();

    await expect(useCase.run("app-1", "APPLIED")).rejects.toThrow(InvalidStatusTransitionError);
    expect(applications.items.get("app-1")?.status).toBe("DISCOVERED");
  });

  it("keeps terminal statuses terminal", async () => {
    await seed({ status: "REJECTED" });

    await expect(useCase.run("app-1", "INTERESTED")).rejects.toThrow(InvalidStatusTransitionError);
    await expect(useCase.run("app-1", "DISCOVERED")).rejects.toThrow(InvalidStatusTransitionError);
  });

  it("returns the application unchanged when the status is already the target", async () => {
    const application = await seed({ status: "REJECTED" });

    const result = await useCase.run("app-1", "REJECTED");

    expect(result).toEqual(application);
    expect(applications.items.get("app-1")).toEqual(application);
  });

  it("stamps appliedAt when entering APPLIED for the first time", async () => {
    await seed({ status: "APPLICATION_READY" });

    const updated = await useCase.run("app-1", "APPLIED");

    expect(updated.appliedAt).toBeInstanceOf(Date);
    expect(updated.appliedAt!.getTime()).toBeCloseTo(Date.now(), -3);
  });

  it("keeps an existing appliedAt untouched", async () => {
    const appliedAt = new Date("2026-10-15T08:00:00Z");
    await seed({ status: "APPLIED", appliedAt });

    const updated = await useCase.run("app-1", "FOLLOW_UP");

    expect(updated.appliedAt).toEqual(appliedAt);
  });

  it("appends a note and sets nextActionAt from options", async () => {
    await seed({ status: "APPLIED", notes: ["first note"] });
    const nextActionAt = new Date("2026-10-25T09:00:00Z");

    const updated = await useCase.run("app-1", "INTERVIEW", {
      note: "technical interview booked",
      nextActionAt,
    });

    expect(updated.notes).toEqual(["first note", "technical interview booked"]);
    expect(updated.nextActionAt).toEqual(nextActionAt);
  });

  it("throws NotFoundError for unknown applications", async () => {
    await expect(useCase.run("missing", "INTERESTED")).rejects.toThrow(NotFoundError);
  });
});
