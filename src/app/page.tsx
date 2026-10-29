import type { Metadata } from "next";
import Link from "next/link";
import type { IngestionRun } from "@/application";
import {
  FitBadge,
  FitStateBadge,
  RemoteBadge,
  SourceBadge,
  StatusBadge,
} from "./_components/badges";
import { FetchJobsForm } from "./_components/fetch-jobs-form";
import {
  analysisRepository,
  applicationRepository,
  ingestionRunRepository,
  listJobs,
  searchProfileRepository,
} from "./_lib/container";
import { formatDate, formatLocation, formatRelativeTime, isStale, isToday } from "./_lib/format";

export const metadata: Metadata = { title: "Hunt" };

const STATUS_ORDER = [
  "INTERESTED",
  "ANALYZED",
  "APPLICATION_READY",
  "APPLIED",
  "FOLLOW_UP",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

const RECENT_OFFERS_LIMIT = 8;
const STRONG_FIT_LIMIT = 5;
/** Cron runs daily (09:00 UTC); >36h without one means it's likely broken. */
const CRON_STALE_MS = 36 * 60 * 60 * 1000;

function publishedDate(job: { publishedAt?: Date; discoveredAt: Date }): Date {
  return job.publishedAt ?? job.discoveredAt;
}

/** One-line cron health: "Last cron 2h ago · fetched 24 · analyzed 8". */
function CronHealthLine({ run }: { run: IngestionRun | null }) {
  if (!run) {
    return (
      <p className="text-xs text-muted">
        No cron runs recorded yet — the first scheduled fetch hasn&apos;t run (or was deployed
        recently).
      </p>
    );
  }
  const stale = isStale(run.finishedAt, CRON_STALE_MS);
  const failed = (run.analysisFailed ?? 0) > 0 || run.errors.length > 0;
  return (
    <p className="text-xs text-muted">
      Last cron{" "}
      <time dateTime={run.finishedAt.toISOString()}>{formatRelativeTime(run.finishedAt)}</time> ·
      fetched {run.fetched} · analyzed {run.analysisAnalyzed ?? "—"}
      {run.errors.length > 0 ? ` · ${run.errors.length} error(s)` : ""}
      {stale ? (
        <span className="ml-1 font-medium text-warn">— overdue, cron may be broken</span>
      ) : failed ? (
        <span className="ml-1 font-medium text-warn">— finished with errors</span>
      ) : null}
    </p>
  );
}

export default async function HuntDashboardPage() {
  const [jobs, applications, profiles, lastCronRun] = await Promise.all([
    listJobs.run(),
    applicationRepository.list(),
    searchProfileRepository.list(),
    ingestionRunRepository.findLatest("cron"),
  ]);
  const analyses = await analysisRepository.getMany(jobs.map((job) => job.id));

  const recentOffers = jobs
    .toSorted((a, b) => publishedDate(b).getTime() - publishedDate(a).getTime())
    .slice(0, RECENT_OFFERS_LIMIT);

  const strongFit = jobs
    .filter((job) => analyses.get(job.id)?.analysis.classification === "STRONG")
    .toSorted((a, b) => publishedDate(b).getTime() - publishedDate(a).getTime())
    .slice(0, STRONG_FIT_LIMIT);

  const newToday = jobs.filter((job) => isToday(job.discoveredAt)).length;
  const awaiting = jobs.filter((job) => job.analysisState === "pending").length;
  const active = applications.filter(
    (app) => app.status !== "REJECTED" && app.status !== "WITHDRAWN",
  ).length;
  const statusCounts = new Map<string, number>();
  for (const app of applications) {
    statusCounts.set(app.status, (statusCounts.get(app.status) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Hunt</h1>
          <p className="text-sm text-muted">Fresh offers and your active pipeline.</p>
        </div>
        <FetchJobsForm profiles={profiles} />
        <CronHealthLine run={lastCronRun} />
      </header>

      <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">Offers tracked</p>
          <p className="mt-1 text-3xl font-semibold">{jobs.length}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">Discovered today</p>
          <p className="mt-1 text-3xl font-semibold">{newToday}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">Awaiting analysis</p>
          <p className="mt-1 text-3xl font-semibold">{awaiting}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">Active applications</p>
          <p className="mt-1 text-3xl font-semibold">{active}</p>
        </div>
      </section>

      {strongFit.length > 0 ? (
        <section aria-label="Strong fit">
          <h2 className="mb-3 text-sm font-medium text-muted">Strong fit</h2>
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {strongFit.map((job) => {
              const record = analyses.get(job.id);
              return (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-4 py-3 hover:bg-paper"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{job.title}</p>
                      <p className="truncate text-xs text-muted">
                        {job.company.name} · {formatLocation(job.location)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {record ? <FitBadge classification={record.analysis.classification} /> : null}
                      <RemoteBadge remoteType={job.remoteType} />
                      <SourceBadge source={job.source} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section aria-label="Recent offers">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-muted">Recent offers</h2>
            <Link href="/jobs" className="text-xs font-medium text-accent-strong hover:underline">
              View all
            </Link>
          </div>
          {recentOffers.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line bg-surface p-4 text-sm text-muted">
              No offers yet. Fetch jobs above to start the hunt.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {recentOffers.map((job) => {
                const record = analyses.get(job.id);
                return (
                  <li key={job.id}>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-4 py-3 hover:bg-paper"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{job.title}</p>
                        <p className="truncate text-xs text-muted">
                          {job.company.name} · {formatLocation(job.location)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {record ? (
                          <FitBadge classification={record.analysis.classification} />
                        ) : (
                          <FitStateBadge state={job.analysisState ?? "none"} />
                        )}
                        <RemoteBadge remoteType={job.remoteType} />
                        <SourceBadge source={job.source} />
                        <time
                          className="font-mono text-xs text-muted"
                          dateTime={publishedDate(job).toISOString()}
                        >
                          {formatDate(publishedDate(job))}
                        </time>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-label="Applications by status">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-muted">Pipeline</h2>
            <Link
              href="/applications"
              className="text-xs font-medium text-accent-strong hover:underline"
            >
              Open pipeline
            </Link>
          </div>
          {applications.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line bg-surface p-4 text-sm text-muted">
              No applications yet. Open a job and create one.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {STATUS_ORDER.filter((status) => statusCounts.has(status)).map((status) => (
                <li key={status} className="flex items-center justify-between px-4 py-2.5">
                  <StatusBadge status={status} />
                  <span className="font-mono text-sm">{statusCounts.get(status)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
