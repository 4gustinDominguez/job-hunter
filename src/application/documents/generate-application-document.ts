import type { DocumentGeneratorPort } from "@/application/ports/document-generator-port";
import type { DocumentRepositoryPort } from "@/application/ports/document-repository-port";
import type { ApplicationRepositoryPort } from "@/application/ports/application-repository-port";
import type { CandidateProfileRepositoryPort } from "@/application/ports/candidate-profile-repository-port";
import type { AnalysisRepositoryPort } from "@/application/ports/analysis-repository-port";
import type { JobRepositoryPort } from "@/application/ports/job-repository-port";
import { NotFoundError, ValidationError } from "@/application/errors";
import type { DocumentKind, GeneratedDocument } from "@/domain/documents/generated-document";

export class GenerateApplicationDocument {
  constructor(
    private readonly generator: DocumentGeneratorPort,
    private readonly applications: ApplicationRepositoryPort,
    private readonly jobs: JobRepositoryPort,
    private readonly profiles: CandidateProfileRepositoryPort,
    private readonly analyses: AnalysisRepositoryPort,
    private readonly documents: DocumentRepositoryPort,
  ) {}

  async run(applicationId: string, kind: DocumentKind): Promise<GeneratedDocument> {
    const application = await this.applications.getById(applicationId);
    if (!application) {
      throw new NotFoundError("Application", applicationId);
    }
    const job = await this.jobs.getById(application.jobId);
    if (!job) {
      throw new NotFoundError("Job", application.jobId);
    }
    const profile = await this.profiles.findFirst();
    if (!profile) {
      throw new ValidationError(
        "profile",
        "No candidate profile found. Create or import one before generating documents.",
      );
    }

    const analysis = (await this.analyses.get(job.id))?.analysis;
    const content = await this.generator.generate(kind, job, profile, analysis);

    const now = new Date();
    const doc: GeneratedDocument = {
      id: crypto.randomUUID(),
      applicationId,
      kind,
      content,
      provider: this.generator.provider,
      model: this.generator.model,
      createdAt: now,
      updatedAt: now,
    };
    await this.documents.save(doc);
    return doc;
  }
}
