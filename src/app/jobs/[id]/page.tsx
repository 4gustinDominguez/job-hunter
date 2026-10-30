/* oxlint-disable react/no-array-index-key -- notes lists are append-only */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FitBadge,
  RemoteBadge,
  SourceAttributionLink,
  SourceBadge,
} from "../../_components/badges";
import {
  addJobNoteAction,
  analyzeJobFitAction,
  createApplicationAction,
  dismissJobAction,
} from "../../_lib/actions";
import {
  analysisRepository,
  applicationRepository,
  getJob,
  jobRepository,
} from "../../_lib/container";
import { formatDate, formatLocation, formatSalary } from "../../_lib/format";
import type { JobAnalysis } from "@/domain/matching/job-analysis";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob.run(id);
  return { title: job ? job.title : "Job" };
}

function AnalysisBreakdown({ analysis }: { analysis: JobAnalysis }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="max-w-[72ch] leading-relaxed">{analysis.reasoning}</p>

      {analysis.matched.length > 0 ? (
        <section aria-label="Matched skills">
          <h3 className="mb-1.5 text-xs font-medium text-muted">Matched</h3>
          <ul className="flex flex-wrap gap-1.5">
            {analysis.matched.map((match) => (
              <li
                key={`${match.skill}-${match.status}`}
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  match.status === "matched"
                    ? "border-accent/20 bg-accent-soft text-accent-strong"
                    : "border-line bg-paper text-muted"
                }`}
                title={
                  match.candidateLevel || match.requiredLevel
                    ? `candidate: ${match.candidateLevel ?? "—"} · required: ${match.requiredLevel ?? "—"}`
                    : undefined
                }
              >
                {match.status === "matched" ? "✓ " : "~ "}
                {match.skill}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {analysis.gaps.length > 0 ? (
        <section aria-label="Gaps">
          <h3 className="mb-1.5 text-xs font-medium text-muted">Potential gaps</h3>
          <ul className="flex flex-col gap-1">
            {analysis.gaps.map((gap) => (
              <li key={gap} className="border-l-2 border-warn/40 pl-3">
                {gap}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {analysis.unknowns.length > 0 ? (
        <section aria-label="Unknowns">
          <h3 className="mb-1.5 text-xs font-medium text-muted">Unknown</h3>
          <ul className="flex flex-col gap-1">
            {analysis.unknowns.map((unknown) => (
              <li key={unknown} className="border-l-2 border-line pl-3 text-muted">
                {unknown}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {analysis.experience.length > 0 ||
      analysis.location.length > 0 ||
      analysis.salary.length > 0 ? (
        <section aria-label="Observations" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {analysis.experience.length > 0 ? (
            <div>
              <h3 className="mb-1.5 text-xs font-medium text-muted">Experience</h3>
              <ul className="flex flex-col gap-1 text-xs">
                {analysis.experience.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {analysis.location.length > 0 ? (
            <div>
              <h3 className="mb-1.5 text-xs font-medium text-muted">Location</h3>
              <ul className="flex flex-col gap-1 text-xs">
                {analysis.location.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {analysis.salary.length > 0 ? (
            <div>
              <h3 className="mb-1.5 text-xs font-medium text-muted">Salary</h3>
              <ul className="flex flex-col gap-1 text-xs">
                {analysis.salary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob.run(id);
  if (!job) {
    notFound();
  }

  const [listings, applications, record] = await Promise.all([
    jobRepository.listListings(job.id),
    applicationRepository.list(),
    analysisRepository.get(job.id),
  ]);
  const existingApplication = applications.find((app) => app.jobId === job.id);
  const notes = job.notes ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/jobs" className="text-sm text-muted hover:text-ink">
        ← All jobs
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold wrap-anywhere">{job.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="font-medium text-ink">{job.company.name}</span>
          <span aria-hidden="true">·</span>
          <span>{formatLocation(job.location)}</span>
          <RemoteBadge remoteType={job.remoteType} />
          <SourceBadge source={job.source} />
          <SourceAttributionLink source={job.source} />
          {record ? <FitBadge classification={record.analysis.classification} /> : null}
        </div>
        <div className="flex justify-end">
          <form action={dismissJobAction}>
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="dismissed" value={job.dismissedAt ? "false" : "true"} />
            <button
              type="submit"
              className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-danger"
            >
              {job.dismissedAt ? "↺ Restore job" : "Not interested"}
            </button>
          </form>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <section
            aria-label="Fit analysis"
            className="rounded-lg border border-line bg-surface p-5"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-muted">Fit analysis</h2>
              {record ? (
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted">
                    {record.provider}/{record.model} · {formatDate(record.createdAt)}
                  </span>
                  <form action={analyzeJobFitAction}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-line px-3 py-1 text-xs font-medium hover:border-accent hover:text-accent-strong"
                    >
                      Re-analyze
                    </button>
                  </form>
                </div>
              ) : (
                <form action={analyzeJobFitAction}>
                  <input type="hidden" name="jobId" value={job.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-strong"
                  >
                    Analyze fit
                  </button>
                </form>
              )}
            </div>
            {record ? (
              <AnalysisBreakdown analysis={record.analysis} />
            ) : job.analysisState === "pending" ? (
              <p className="text-sm text-muted">
                Queued for batch analysis (run <code className="font-mono">pnpm analyze-jobs</code>)
                or analyze now with the button above.
              </p>
            ) : job.analysisState === "failed" ? (
              <p className="text-sm text-warn">
                The last analysis attempt failed. Retry with the button above.
              </p>
            ) : (
              <p className="text-sm text-muted">
                Not analyzed yet. Compares this offer against your candidate profile.
              </p>
            )}
          </section>

          <section
            aria-label="Description"
            className="rounded-lg border border-line bg-surface p-5"
          >
            <h2 className="mb-3 text-sm font-medium text-muted">Description</h2>
            <p className="max-w-[72ch] text-sm leading-relaxed whitespace-pre-line">
              {job.description}
            </p>
          </section>

          <section aria-label="Notes" className="rounded-lg border border-line bg-surface p-5">
            <h2 className="mb-3 text-sm font-medium text-muted">Notes</h2>
            {notes.length > 0 ? (
              <ul className="mb-3 flex flex-col gap-1 text-sm">
                {notes.map((note, index) => (
                  <li key={`${job.id}-note-${index}`} className="border-l-2 border-line pl-3">
                    {note}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-sm text-muted">
                No notes yet — your own words about this offer.
              </p>
            )}
            <form action={addJobNoteAction} className="flex items-end gap-2">
              <input type="hidden" name="jobId" value={job.id} />
              <label htmlFor={`job-note-${job.id}`} className="sr-only">
                Add a note
              </label>
              <input
                id={`job-note-${job.id}`}
                name="note"
                placeholder="Add a note…"
                className="h-9 min-w-32 flex-1 rounded-md border border-line bg-paper px-3 text-sm"
              />
              <button
                type="submit"
                className="h-9 rounded-md bg-ink px-3 text-xs font-medium text-white hover:bg-black"
              >
                Add note
              </button>
            </form>
          </section>

          <section aria-label="Sources">
            <h2 className="mb-3 text-sm font-medium text-muted">Listings ({listings.length})</h2>
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {listings.map((listing) => (
                <li
                  key={`${listing.source}-${listing.externalId ?? listing.url}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <SourceBadge source={listing.source} />
                    {listing.externalId ? (
                      <span className="font-mono text-xs text-muted">{listing.externalId}</span>
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-col items-end">
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noreferrer"
                      className="max-w-full truncate font-mono text-xs text-accent-strong hover:underline"
                    >
                      {listing.url}
                    </a>
                    <time
                      className="font-mono text-xs text-muted"
                      dateTime={listing.discoveredAt.toISOString()}
                    >
                      discovered {formatDate(listing.discoveredAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section aria-label="Details" className="rounded-lg border border-line bg-surface p-4">
            <h2 className="mb-3 text-sm font-medium text-muted">Details</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Contract</dt>
                <dd>
                  {job.employmentType ? job.employmentType.toLowerCase().replace(/_/g, " ") : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Salary</dt>
                <dd className="text-right font-mono text-xs">
                  {job.salary ? formatSalary(job.salary) : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Discovered</dt>
                <dd className="font-mono text-xs">{formatDate(job.discoveredAt)}</dd>
              </div>
              {job.publishedAt ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Published</dt>
                  <dd className="font-mono text-xs">{formatDate(job.publishedAt)}</dd>
                </div>
              ) : null}
            </dl>
            {job.skills && job.skills.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-line bg-paper px-2 py-0.5 text-xs text-muted"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section aria-label="Actions">
            {existingApplication ? (
              <Link
                href={`/applications/${existingApplication.id}`}
                className="block rounded-md border border-line bg-surface px-4 py-2.5 text-center text-sm font-medium hover:bg-paper"
              >
                Open application →
              </Link>
            ) : (
              <form action={createApplicationAction}>
                <input type="hidden" name="jobId" value={job.id} />
                <button
                  type="submit"
                  className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-strong"
                >
                  Create application
                </button>
              </form>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
