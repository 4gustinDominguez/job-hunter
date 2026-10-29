import { desc, eq } from "drizzle-orm";
import type {
  IngestionRun,
  IngestionRunRepositoryPort,
  IngestionRunTrigger,
} from "@/application/ports/ingestion-run-repository-port";
import type { db } from "./client";
import { ingestionRuns } from "./schema";

type Db = typeof db;
type IngestionRunRow = typeof ingestionRuns.$inferSelect;

function toRun(row: IngestionRunRow): IngestionRun {
  return {
    id: row.id,
    trigger: row.trigger,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    durationMs: row.durationMs,
    fetched: row.fetched,
    created: row.created,
    attached: row.attached,
    skipped: row.skipped,
    prefilterPending: row.prefilterPending,
    prefilterSkipped: row.prefilterSkipped,
    analysisAnalyzed: row.analysisAnalyzed,
    analysisFailed: row.analysisFailed,
    errors: row.errors,
  };
}

export class DrizzleIngestionRunRepository implements IngestionRunRepositoryPort {
  constructor(private readonly database: Db) {}

  async save(run: Omit<IngestionRun, "id" | "durationMs">): Promise<void> {
    await this.database.insert(ingestionRuns).values({
      trigger: run.trigger,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      durationMs: run.finishedAt.getTime() - run.startedAt.getTime(),
      fetched: run.fetched,
      created: run.created,
      attached: run.attached,
      skipped: run.skipped,
      prefilterPending: run.prefilterPending,
      prefilterSkipped: run.prefilterSkipped,
      analysisAnalyzed: run.analysisAnalyzed,
      analysisFailed: run.analysisFailed,
      errors: run.errors,
    });
  }

  async findLatest(trigger?: IngestionRunTrigger): Promise<IngestionRun | null> {
    const query = this.database.select().from(ingestionRuns);
    const rows = trigger
      ? await query
          .where(eq(ingestionRuns.trigger, trigger))
          .orderBy(desc(ingestionRuns.finishedAt))
          .limit(1)
      : await query.orderBy(desc(ingestionRuns.finishedAt)).limit(1);
    const [row] = rows;
    return row ? toRun(row) : null;
  }
}
