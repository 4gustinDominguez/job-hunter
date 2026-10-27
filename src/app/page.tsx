import type { Metadata } from "next";
import Link from "next/link";
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
import { formatDate, formatLocation, isOlderThan, startOfToday, timeAgo } from "./_lib/format";

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

function publishedDate(job: { publishedAt?: Date; discoveredAt: Date }): Date {
  return job.publishedAt ?? job.discoveredAt;
}

export default async function HuntDashboardPage() {
  // Counters and lists are separate SQL pages — the dashboard must not load
  // the whole jobs table (~8 MB of descriptions at 2.3k rows).
  const [tracked, newToday, awaiting, recentResult, strongResult, applications, profiles, lastRun] =
    await Promise.all([
      listJobs.page({}, { limit: 1, offset: 0 }),
      listJobs.page({ discoveredSince: startOfToday() }, { limit: 1, offset: 0 }),
      listJobs.page({ analysisState: "pending" }, { limit: 1, offset: 0 }),
      listJobs.page({ excludeApplied: true }, { limit: RECENT_OFFERS_LIMIT, offset: 0 }),
      listJobs.page(
        { classifications: ["STRONG"], excludeApplied: true },
        { limit: STRONG_FIT_LIMIT, offset: 0 },
      ),
      applicationRepository.list(),
      searchProfileRepository.list(),
      ingestionRunRepository.latest(),
    ]);
  const recentOffers = recentResult.jobs;
  const strongFit = strongResult.jobs;
  const analyses = await analysisRepository.getMany(
    [...recentOffers, ...strongFit].map((job) => job.id),
  );

  const jobsTracked = tracked.total;
  const newTodayCount = newToday.total;
  const awaitingCount = awaiting.total;
  const active = applications.filter(
    (app) => app.status !== "REJECTED" && app.status !== "WITHDRAWN",
  ).length;
  const statusCounts = new Map<string, number>();
  for (const app of applications) {
    statusCounts.set(app.status, (statusCounts.get(app.status) ?? 0) + 1);
  }
  // Phase 11 (cheap part): last-run health from ingestion_runs — no more
  // digging through Vercel logs to know whether the 9:00 cron actually ran.
  const STALE_AFTER_MS = 36 * 60 * 60 * 1000;
  const lastRunUnfinished = lastRun !== null && lastRun.finishedAt === undefined;
  const lastRunStale =
    lastRun?.finishedAt !== undefined && isOlderThan(lastRun.finishedAt, STALE_AFTER_MS);
  const lastRunParts =
    lastRun !== null
      ? [
          `fetched ${lastRun.fetched}`,
          `created ${lastRun.created}`,
          ...(lastRun.analyzed > 0 ? [`analyzed ${lastRun.analyzed}`] : []),
          ...(lastRun.failed > 0 ? [`failed ${lastRun.failed}`] : []),
          ...(lastRun.errors.length > 0 ? [`${lastRun.errors.length} error(s)`] : []),
        ]
      : [];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Hunt</h1>
          <p className="text-sm text-muted">Fresh offers and your active pipeline.</p>
        </div>
        <FetchJobsForm profiles={profiles} />
        {lastRun === null ? (
          <p className="text-xs text-muted">
            No runs recorded yet — the first fetch or the daily cron will show up here.
          </p>
        ) : lastRunUnfinished ? (
          <p role="alert" className="text-xs text-danger">
            ⚠ The {lastRun.kind} run started {timeAgo(lastRun.startedAt)} and never finished — it
            likely crashed or hit a timeout.
          </p>
        ) : (
          <p className={`text-xs ${lastRunStale ? "text-warn" : "text-muted"}`}>
            Last run: {timeAgo(lastRun.finishedAt as Date)} ({lastRun.kind}) ·{" "}
            {lastRunParts.join(" · ")}
            {lastRunStale ? " · nothing since — check the cron" : ""}
          </p>
        )}
      </header>

      <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">Offers tracked</p>
          <p className="mt-1 text-3xl font-semibold">{jobsTracked}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">Discovered today</p>
          <p className="mt-1 text-3xl font-semibold">{newTodayCount}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">Awaiting analysis</p>
          <p className="mt-1 text-3xl font-semibold">{awaitingCount}</p>
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
