import { NotFoundError } from "@/application/errors";
import type { CvVersionRepositoryPort } from "@/application/ports/cv-version-repository-port";

export class DeleteCvVersion {
  constructor(private readonly versions: CvVersionRepositoryPort) {}

  async run(id: string): Promise<void> {
    const version = await this.versions.getById(id);
    if (!version) {
      throw new NotFoundError("CV version", id);
    }
    await this.versions.remove(id);
  }
}
