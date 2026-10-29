import type { IngestionRunInput } from "@/application/ports/ingestion-run-repository-port";
import { ingestionRunRepository } from "./container";

/**
 * Persists one ingestion run (cron or manual) for the dashboard's cron-health
 * line. Observability must never break the run itself: a failed save is
 * logged and swallowed — the worst case is a missing row, which the stale
 * warning already surfaces.
 *
 * No PII: `errors` carries provider/source error texts only.
 */
export async function recordIngestionRun(
  input: Omit<IngestionRunInput, "finishedAt">,
): Promise<void> {
  try {
    await ingestionRunRepository.save({ ...input, finishedAt: new Date() });
  } catch (error) {
    console.error("[ingestion-run] failed to record run:", error);
  }
}
