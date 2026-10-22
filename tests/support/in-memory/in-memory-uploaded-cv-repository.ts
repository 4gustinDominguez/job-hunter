import type {
  UploadedCv,
  UploadedCvRepositoryPort,
} from "@/application/ports/uploaded-cv-repository-port";

export class InMemoryUploadedCvRepository implements UploadedCvRepositoryPort {
  private record: UploadedCv | null = null;

  async get(): Promise<UploadedCv | null> {
    return this.record;
  }

  async save(file: { filename: string; content: Buffer }): Promise<UploadedCv> {
    this.record = {
      filename: file.filename,
      content: file.content,
      size: file.content.length,
      uploadedAt: new Date(),
    };
    return this.record;
  }
}
