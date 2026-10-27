import type { IngestionRunRepositoryPort } from "@/application/ports/ingestion-run-repository-port";
import type { IngestionRun, IngestionRunSummary } from "@/domain/job/ingestion-run";
import type { IngestionRunKind } from "@/domain/job/enums";

export class InMemoryIngestionRunRepository implements IngestionRunRepositoryPort {
  readonly runs: IngestionRun[] = [];
  private counter = 0;

  async start(kind: IngestionRunKind): Promise<string> {
    this.counter += 1;
    const id = `run-${this.counter}`;
    this.runs.push({
      id,
      kind,
      startedAt: new Date(),
      fetched: 0,
      created: 0,
      attached: 0,
      skipped: 0,
      prefilterQueued: 0,
      prefilterSkipped: 0,
      analyzed: 0,
      strong: 0,
      potential: 0,
      weak: 0,
      none: 0,
      failed: 0,
      errors: [],
    });
    return id;
  }

  async finish(id: string, summary: IngestionRunSummary): Promise<void> {
    const run = this.runs.find((candidate) => candidate.id === id);
    if (!run) throw new Error(`InMemoryIngestionRunRepository: run ${id} not found`);
    run.finishedAt = new Date();
    run.fetched = summary.fetched;
    run.created = summary.created;
    run.attached = summary.attached;
    run.skipped = summary.skipped;
    run.prefilterQueued = summary.prefilterQueued ?? 0;
    run.prefilterSkipped = summary.prefilterSkipped ?? 0;
    run.analyzed = summary.analyzed ?? 0;
    run.strong = summary.strong ?? 0;
    run.potential = summary.potential ?? 0;
    run.weak = summary.weak ?? 0;
    run.none = summary.none ?? 0;
    run.failed = summary.failed ?? 0;
    run.errors = summary.errors ?? [];
  }

  async latest(): Promise<IngestionRun | null> {
    if (this.runs.length === 0) return null;
    return this.runs.reduce((newest, run) =>
      run.startedAt.getTime() > newest.startedAt.getTime() ? run : newest,
    );
  }
}
