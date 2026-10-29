export const INGESTION_RUN_TRIGGERS = ["cron", "manual"] as const;
export type IngestionRunTrigger = (typeof INGESTION_RUN_TRIGGERS)[number];

export interface IngestionRunInput {
  trigger: IngestionRunTrigger;
  startedAt: Date;
  finishedAt: Date;
  fetched: number;
  created: number;
  attached: number;
  skipped: number;
  prefilterPending: number;
  prefilterSkipped: number;
  /** null when the run did not include the analysis batch (manual fetch). */
  analysisAnalyzed: number | null;
  /** null when the run did not include the analysis batch (manual fetch). */
  analysisFailed: number | null;
  /** Provider/source error texts only — never PII (counts and messages). */
  errors: string[];
}

export interface IngestionRun extends IngestionRunInput {
  id: string;
  durationMs: number;
}

/**
 * One row per ingestion execution (cron or manual fetch) — the app-side cron
 * health signal ("is the daily fetch still running?"), independent of any
 * external tool. Latest-run queries power the dashboard header line.
 */
export interface IngestionRunRepositoryPort {
  save(run: IngestionRunInput): Promise<void>;
  findLatest(trigger?: IngestionRunTrigger): Promise<IngestionRun | null>;
}
