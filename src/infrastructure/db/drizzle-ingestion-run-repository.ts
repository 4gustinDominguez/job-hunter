import { desc, eq } from "drizzle-orm";
import type { IngestionRunRepositoryPort } from "@/application/ports/ingestion-run-repository-port";
import type { IngestionRun, IngestionRunSummary } from "@/domain/job/ingestion-run";
import type { IngestionRunKind } from "@/domain/job/enums";
import type { db } from "./client";
import { ingestionRuns } from "./schema";

type Db = typeof db;
type Row = typeof ingestionRuns.$inferSelect;

function toDomain(row: Row): IngestionRun {
  return {
    id: row.id,
    kind: row.kind,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt ?? undefined,
    fetched: row.fetched,
    created: row.created,
    attached: row.attached,
    skipped: row.skipped,
    prefilterQueued: row.prefilterQueued,
    prefilterSkipped: row.prefilterSkipped,
    analyzed: row.analyzed,
    strong: row.strong,
    potential: row.potential,
    weak: row.weak,
    none: row.none,
    failed: row.failed,
    errors: row.errors,
  };
}

export class DrizzleIngestionRunRepository implements IngestionRunRepositoryPort {
  constructor(private readonly database: Db) {}

  async start(kind: IngestionRunKind): Promise<string> {
    const [row] = await this.database
      .insert(ingestionRuns)
      .values({ kind, startedAt: new Date() })
      .returning({ id: ingestionRuns.id });
    return row.id;
  }

  async finish(id: string, summary: IngestionRunSummary): Promise<void> {
    await this.database
      .update(ingestionRuns)
      .set({
        finishedAt: new Date(),
        fetched: summary.fetched,
        created: summary.created,
        attached: summary.attached,
        skipped: summary.skipped,
        prefilterQueued: summary.prefilterQueued ?? 0,
        prefilterSkipped: summary.prefilterSkipped ?? 0,
        analyzed: summary.analyzed ?? 0,
        strong: summary.strong ?? 0,
        potential: summary.potential ?? 0,
        weak: summary.weak ?? 0,
        none: summary.none ?? 0,
        failed: summary.failed ?? 0,
        errors: summary.errors ?? [],
      })
      .where(eq(ingestionRuns.id, id));
  }

  async latest(): Promise<IngestionRun | null> {
    const [row] = await this.database
      .select()
      .from(ingestionRuns)
      .orderBy(desc(ingestionRuns.startedAt))
      .limit(1);
    return row ? toDomain(row) : null;
  }
}
