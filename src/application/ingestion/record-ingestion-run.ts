import type { IngestionRunRepositoryPort } from "@/application/ports/ingestion-run-repository-port";
import type { IngestionRunSummary } from "@/domain/job/ingestion-run";
import type { IngestionRunKind } from "@/domain/job/enums";

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Wraps a fetch/prefilter/analysis run so every attempt leaves a row in
 * `ingestion_runs`: start → run → finish with counts. If the run throws, the
 * row still finishes with an `exception` error (a *missing* finish means the
 * process died mid-run — timeout/crash — which is exactly what the dashboard
 * needs to flag). The original error always propagates.
 */
export async function recordIngestionRun(
  repository: IngestionRunRepositoryPort,
  kind: IngestionRunKind,
  run: () => Promise<IngestionRunSummary>,
): Promise<IngestionRunSummary> {
  const id = await repository.start(kind);
  try {
    const summary = await run();
    await repository.finish(id, summary);
    return summary;
  } catch (error) {
    await repository
      .finish(id, {
        fetched: 0,
        created: 0,
        attached: 0,
        skipped: 0,
        errors: [{ stage: "exception", message: toMessage(error) }],
      })
      .catch(() => undefined);
    throw error;
  }
}
