import { eq, inArray } from "drizzle-orm";
import type {
  AnalysisRepositoryPort,
  JobAnalysisRecord,
} from "@/application/ports/analysis-repository-port";
import type { JobAnalysis } from "@/domain/matching/job-analysis";
import type { db } from "./client";
import { jobAnalyses } from "./schema";

type Db = typeof db;
type AnalysisRow = typeof jobAnalyses.$inferSelect;

function toRecord(row: AnalysisRow): JobAnalysisRecord {
  return {
    jobId: row.jobId,
    analysis: row.analysis as JobAnalysis,
    provider: row.provider,
    model: row.model,
    createdAt: row.createdAt,
  };
}

export class DrizzleAnalysisRepository implements AnalysisRepositoryPort {
  constructor(private readonly database: Db) {}

  async get(jobId: string): Promise<JobAnalysisRecord | null> {
    const [row] = await this.database
      .select()
      .from(jobAnalyses)
      .where(eq(jobAnalyses.jobId, jobId))
      .limit(1);
    return row ? toRecord(row) : null;
  }

  async getMany(jobIds: string[]): Promise<Map<string, JobAnalysisRecord>> {
    const map = new Map<string, JobAnalysisRecord>();
    if (jobIds.length === 0) return map;
    const rows = await this.database
      .select()
      .from(jobAnalyses)
      .where(inArray(jobAnalyses.jobId, jobIds));
    for (const row of rows) {
      map.set(row.jobId, toRecord(row));
    }
    return map;
  }

  async save(jobId: string, record: Omit<JobAnalysisRecord, "jobId">): Promise<void> {
    const values = {
      classification: record.analysis.classification,
      analysis: record.analysis,
      reasoning: record.analysis.reasoning,
      provider: record.provider,
      model: record.model,
      createdAt: record.createdAt,
    };
    await this.database
      .insert(jobAnalyses)
      .values({ jobId, ...values })
      .onConflictDoUpdate({ target: jobAnalyses.jobId, set: values });
  }
}
