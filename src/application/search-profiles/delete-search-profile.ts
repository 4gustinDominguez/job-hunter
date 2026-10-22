import { NotFoundError } from "@/application/errors";
import type { SearchProfileRepositoryPort } from "@/application/ports/search-profile-repository-port";

export class DeleteSearchProfile {
  constructor(private readonly profiles: SearchProfileRepositoryPort) {}

  async run(id: string): Promise<void> {
    const profile = await this.profiles.getById(id);
    if (!profile) {
      throw new NotFoundError("SearchProfile", id);
    }
    await this.profiles.remove(id);
  }
}
