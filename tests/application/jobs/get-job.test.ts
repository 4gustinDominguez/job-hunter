import { beforeEach, describe, expect, it } from "vitest";
import { GetJob } from "@/application/jobs/get-job";
import { makeJob } from "../../support/make-job";
import { InMemoryJobRepository } from "../../support/in-memory/in-memory-job-repository";

describe("GetJob", () => {
  let jobs: InMemoryJobRepository;
  let useCase: GetJob;

  beforeEach(async () => {
    jobs = new InMemoryJobRepository();
    useCase = new GetJob(jobs);
    await jobs.save(makeJob({ id: "job-1" }), "company-1");
  });

  it("returns the job when it exists", async () => {
    const job = await useCase.run("job-1");

    expect(job?.id).toBe("job-1");
  });

  it("returns null for unknown ids instead of throwing", async () => {
    expect(await useCase.run("missing")).toBeNull();
  });
});
