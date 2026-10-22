import { beforeEach, describe, expect, it } from "vitest";
import { GenerateApplicationDocument } from "@/application/documents/generate-application-document";
import { NotFoundError, ValidationError } from "@/application/errors";
import type { DocumentGeneratorPort } from "@/application/ports/document-generator-port";
import type { DocumentKind } from "@/domain/documents/generated-document";
import type { JobAnalysis } from "@/domain/matching/job-analysis";
import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import type { Job } from "@/domain/job/job";
import { InMemoryAnalysisRepository } from "../../support/in-memory/in-memory-analysis-repository";
import { InMemoryApplicationRepository } from "../../support/in-memory/in-memory-application-repository";
import { InMemoryCandidateProfileRepository } from "../../support/in-memory/in-memory-candidate-profile-repository";
import { InMemoryDocumentRepository } from "../../support/in-memory/in-memory-document-repository";
import { InMemoryJobRepository } from "../../support/in-memory/in-memory-job-repository";
import { makeJob } from "../../support/make-job";
import { makeProfile } from "../../support/make-profile";

class StubGenerator implements DocumentGeneratorPort {
  readonly provider = "stub";
  readonly model = "stub-model";
  lastAnalysis: JobAnalysis | undefined;

  constructor(private readonly content = "Generated document body.") {}

  async generate(
    _kind: DocumentKind,
    _job: Job,
    _profile: CandidateProfile,
    analysis?: JobAnalysis,
  ): Promise<string> {
    this.lastAnalysis = analysis;
    return this.content;
  }
}

describe("GenerateApplicationDocument", () => {
  let applications: InMemoryApplicationRepository;
  let jobs: InMemoryJobRepository;
  let profiles: InMemoryCandidateProfileRepository;
  let analyses: InMemoryAnalysisRepository;
  let documents: InMemoryDocumentRepository;
  let jobId: string;
  let applicationId: string;

  beforeEach(async () => {
    applications = new InMemoryApplicationRepository();
    jobs = new InMemoryJobRepository();
    profiles = new InMemoryCandidateProfileRepository();
    analyses = new InMemoryAnalysisRepository();
    documents = new InMemoryDocumentRepository();
    const job = makeJob();
    await jobs.save(job, "company-1");
    jobId = job.id;
    const application = await applications.create({
      id: "app-1",
      jobId,
      status: "INTERESTED",
    });
    applicationId = application.id;
    await profiles.save(makeProfile());
  });

  function useCase(generator: DocumentGeneratorPort) {
    return new GenerateApplicationDocument(
      generator,
      applications,
      jobs,
      profiles,
      analyses,
      documents,
    );
  }

  it("generates, stamps provider/model and stores the document", async () => {
    const generator = new StubGenerator("Dear Hiring team…");

    const doc = await useCase(generator).run(applicationId, "COVER_LETTER");

    expect(doc.content).toBe("Dear Hiring team…");
    expect(doc.provider).toBe("stub");
    expect(doc.model).toBe("stub-model");
    expect(doc.applicationId).toBe(applicationId);
    expect(doc.kind).toBe("COVER_LETTER");
    const stored = await documents.get(applicationId, "COVER_LETTER");
    expect(stored?.content).toBe("Dear Hiring team…");
  });

  it("passes the stored fit analysis to the generator when one exists", async () => {
    const analysis: JobAnalysis = {
      classification: "STRONG",
      matched: [],
      gaps: ["Kubernetes"],
      unknowns: [],
      experience: [],
      location: [],
      salary: [],
      reasoning: "Strong core stack overlap.",
    };
    await analyses.save(jobId, {
      analysis,
      provider: "stub",
      model: "stub",
      createdAt: new Date(),
    });
    const generator = new StubGenerator();

    await useCase(generator).run(applicationId, "TAILORED_CV");

    expect(generator.lastAnalysis?.classification).toBe("STRONG");
  });

  it("overwrites an existing document of the same kind (regenerate)", async () => {
    const first = new StubGenerator("v1");
    await useCase(first).run(applicationId, "COVER_LETTER");

    const second = new StubGenerator("v2");
    await useCase(second).run(applicationId, "COVER_LETTER");

    const stored = await documents.get(applicationId, "COVER_LETTER");
    expect(stored?.content).toBe("v2");
    expect(await documents.listByApplication(applicationId)).toHaveLength(1);
  });

  it("fails for an unknown application", async () => {
    await expect(useCase(new StubGenerator()).run("missing", "COVER_LETTER")).rejects.toThrowError(
      NotFoundError,
    );
  });

  it("fails without a candidate profile", async () => {
    const emptyProfiles = new InMemoryCandidateProfileRepository();
    const instance = new GenerateApplicationDocument(
      new StubGenerator(),
      applications,
      jobs,
      emptyProfiles,
      analyses,
      documents,
    );

    await expect(instance.run(applicationId, "COVER_LETTER")).rejects.toThrowError(ValidationError);
  });
});
