import type { CvVersion } from "@/domain/candidate/cv-version";

export interface CvVersionRepositoryPort {
  /** Newest first, for the versions panel. */
  listByProfile(profileId: string): Promise<CvVersion[]>;
  getById(id: string): Promise<CvVersion | null>;
  save(version: CvVersion): Promise<CvVersion>;
  remove(id: string): Promise<void>;
}
