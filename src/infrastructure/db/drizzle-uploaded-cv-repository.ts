import { desc } from "drizzle-orm";
import type {
  UploadedCv,
  UploadedCvRepositoryPort,
} from "@/application/ports/uploaded-cv-repository-port";
import type { db } from "./client";
import { uploadedCvs } from "./schema";

type Db = typeof db;

export class DrizzleUploadedCvRepository implements UploadedCvRepositoryPort {
  constructor(private readonly database: Db) {}

  async get(): Promise<UploadedCv | null> {
    const [row] = await this.database
      .select()
      .from(uploadedCvs)
      .orderBy(desc(uploadedCvs.uploadedAt))
      .limit(1);
    if (!row) return null;
    return {
      filename: row.filename,
      content: row.content,
      size: row.size,
      uploadedAt: row.uploadedAt,
    };
  }

  async save(file: { filename: string; content: Buffer }): Promise<UploadedCv> {
    // Single-row semantics: replace whatever is on record.
    await this.database.delete(uploadedCvs);
    const [row] = await this.database
      .insert(uploadedCvs)
      .values({
        filename: file.filename,
        content: file.content,
        size: file.content.length,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to store the uploaded CV.");
    }
    return {
      filename: row.filename,
      content: row.content,
      size: row.size,
      uploadedAt: row.uploadedAt,
    };
  }
}
