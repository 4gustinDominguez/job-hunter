import type { IngestionRunKind } from "./enums";

/** Error captured for a run — counts + texts only, never PII (log rule). */
export interface IngestionRunError {
  stage: "ingest" | "prefilter" | "analysis" | "exception";
  source?: string;
  message: string;
}

export interface IngestionRunSummary {
  fetched: number;
  created: number;
  attached: number;
  skipped: number;
  prefilterQueued?: number;
  prefilterSkipped?: number;
  analyzed?: number;
  strong?: number;
  potential?: number;
  weak?: number;
  none?: number;
  failed?: number;
  errors?: IngestionRunError[];
}

export interface IngestionRun {
  id: string;
  kind: IngestionRunKind;
  startedAt: Date;
  finishedAt?: Date;
  fetched: number;
  created: number;
  attached: number;
  skipped: number;
  prefilterQueued: number;
  prefilterSkipped: number;
  analyzed: number;
  strong: number;
  potential: number;
  weak: number;
  none: number;
  failed: number;
  errors: IngestionRunError[];
}
