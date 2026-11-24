import { desc, eq } from "drizzle-orm";
import type { CvVersionRepositoryPort } from "@/application/ports/cv-version-repository-port";
import type { CvVersion } from "@/domain/candidate/cv-version";
import type { db } from "./client";
import { cvVersions } from "./schema";

type Db = typeof db;
type VersionRow = typeof cvVersions.$inferSelect;

function toDomain(row: VersionRow): CvVersion {
  return {
    id: row.id,
    profileId: row.profileId,
    label: row.label,
    snapshot: row.snapshot,
    createdAt: row.createdAt,
  };
}

export class DrizzleCvVersionRepository implements CvVersionRepositoryPort {
  constructor(private readonly database: Db) {}

  async listByProfile(profileId: string): Promise<CvVersion[]> {
    const rows = await this.database
      .select()
      .from(cvVersions)
      .where(eq(cvVersions.profileId, profileId))
      .orderBy(desc(cvVersions.createdAt));
    return rows.map(toDomain);
  }

  async getById(id: string): Promise<CvVersion | null> {
    const [row] = await this.database
      .select()
      .from(cvVersions)
      .where(eq(cvVersions.id, id))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async save(version: CvVersion): Promise<CvVersion> {
    const [row] = await this.database
      .insert(cvVersions)
      .values({
        id: version.id,
        profileId: version.profileId,
        label: version.label,
        snapshot: version.snapshot,
        createdAt: version.createdAt,
      })
      .returning();
    return toDomain(row);
  }

  async remove(id: string): Promise<void> {
    await this.database.delete(cvVersions).where(eq(cvVersions.id, id));
  }
}
