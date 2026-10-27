import type { IngestionRun, IngestionRunSummary } from "@/domain/job/ingestion-run";
import type { IngestionRunKind } from "@/domain/job/enums";

export interface IngestionRunRepositoryPort {
  /** Inserts the in-progress row and returns its id. */
  start(kind: IngestionRunKind): Promise<string>;
  /** Fills in the counts and sets finished_at (the only happy-path writer). */
  finish(id: string, summary: IngestionRunSummary): Promise<void>;
  /** Most recent run for the dashboard (unfinished rows included). */
  latest(): Promise<IngestionRun | null>;
}
