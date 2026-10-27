import type { Metadata } from "next";
import Link from "next/link";
import { FitBadge, FitStateBadge, RemoteBadge, SourceBadge } from "../_components/badges";
import { analysisRepository, listJobs } from "../_lib/container";
import { formatLocation, formatSalary } from "../_lib/format";
import { EMPLOYMENT_TYPES, REMOTE_TYPES } from "@/domain/job/enums";
import { JOB_SOURCE_TYPES } from "@/domain/job/enums";
import type { EmploymentType, JobSourceType, RemoteType } from "@/domain/job/enums";
import type { Job } from "@/domain/job/job";
import {
  ANALYSIS_STATES,
  MATCH_CLASSIFICATIONS,
  type AnalysisState,
  type MatchClassification,
} from "@/domain/matching/job-analysis";

export const metadata: Metadata = { title: "Jobs" };

function asEnumValue<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

/** Checkbox groups arrive as repeated params; also accept `fit=STRONG,POTENTIAL`. */
function enumListParam<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
): T[] {
  const raw = value === undefined ? [] : Array.isArray(value) ? value : [value];
  const seen = new Set<T>();
  for (const entry of raw) {
    for (const part of entry.split(",")) {
      const parsed = asEnumValue<T>(part.trim(), allowed);
      if (parsed) seen.add(parsed);
    }
  }
  return [...seen];
}

function publishedDate(job: Job): Date {
  return job.publishedAt ?? job.discoveredAt;
}

function selectValue(value: string): string {
  return value;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const location = typeof sp.location === "string" ? sp.location : "";
  const remoteType = asEnumValue<RemoteType>(sp.remote, REMOTE_TYPES);
  const employmentType = asEnumValue<EmploymentType>(sp.type, EMPLOYMENT_TYPES);
  const source = asEnumValue<JobSourceType>(sp.source, JOB_SOURCE_TYPES);
  const fitValues = enumListParam<MatchClassification>(sp.fit, MATCH_CLASSIFICATIONS);
  const state = asEnumValue<AnalysisState>(sp.state, ANALYSIS_STATES);
  const sortByFit = sp.sort === "fit";

  const allJobs = await listJobs.run({
    query: q || undefined,
    location: location || undefined,
    remoteType,
    employmentType,
    source,
  });
  const analyses = await analysisRepository.getMany(allJobs.map((job) => job.id));

  let jobs = allJobs;
  if (fitValues.length > 0) {
    jobs = jobs.filter((job) => {
      const record = analyses.get(job.id);
      return record !== undefined && fitValues.includes(record.analysis.classification);
    });
  }
  if (state) {
    jobs = jobs.filter((job) => (job.analysisState ?? "none") === state);
  }
  if (sortByFit) {
    const rank = (job: Job): number => {
      const record = analyses.get(job.id);
      return record
        ? MATCH_CLASSIFICATIONS.indexOf(record.analysis.classification)
        : MATCH_CLASSIFICATIONS.length;
    };
    jobs = jobs.toSorted(
      (a, b) => rank(a) - rank(b) || publishedDate(b).getTime() - publishedDate(a).getTime(),
    );
  }

  const hasFilters = Boolean(
    q ||
    location ||
    remoteType ||
    employmentType ||
    source ||
    fitValues.length ||
    state ||
    sortByFit,
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <p className="text-sm text-muted">{jobs.length} matching</p>
        </div>
        <Link href="/" className="text-sm font-medium text-accent-strong hover:underline">
          Fetch new jobs
        </Link>
      </header>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4"
      >
        <div className="flex min-w-40 flex-col gap-1">
          <label htmlFor="q" className="text-xs text-muted">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="title, company, description"
            className="h-9 rounded-md border border-line bg-paper px-3 text-sm"
          />
        </div>
        <div className="flex min-w-32 flex-col gap-1">
          <label htmlFor="location" className="text-xs text-muted">
            Location
          </label>
          <input
            id="location"
            name="location"
            defaultValue={location}
            placeholder="Madrid"
            className="h-9 rounded-md border border-line bg-paper px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="remote" className="text-xs text-muted">
            Remote
          </label>
          <select
            id="remote"
            name="remote"
            defaultValue={selectValue(remoteType ?? "")}
            className="h-9 rounded-md border border-line bg-paper px-2 text-sm"
          >
            <option value="">Any</option>
            {REMOTE_TYPES.map((value) => (
              <option key={value} value={value}>
                {value.toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-xs text-muted">
            Contract
          </label>
          <select
            id="type"
            name="type"
            defaultValue={selectValue(employmentType ?? "")}
            className="h-9 rounded-md border border-line bg-paper px-2 text-sm"
          >
            <option value="">Any</option>
            {EMPLOYMENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {value.toLowerCase().replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="source" className="text-xs text-muted">
            Source
          </label>
          <select
            id="source"
            name="source"
            defaultValue={selectValue(source ?? "")}
            className="h-9 rounded-md border border-line bg-paper px-2 text-sm"
          >
            <option value="">Any</option>
            {JOB_SOURCE_TYPES.map((value) => (
              <option key={value} value={value}>
                {value.toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted">Fit</span>
          <div className="flex h-9 items-center gap-3">
            {MATCH_CLASSIFICATIONS.map((value) => (
              <label
                key={value}
                htmlFor={`fit-${value}`}
                className="flex items-center gap-1.5 text-sm"
              >
                <input
                  id={`fit-${value}`}
                  type="checkbox"
                  name="fit"
                  value={value}
                  defaultChecked={fitValues.includes(value)}
                  className="size-4 accent-accent"
                />
                {value.toLowerCase()}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="state" className="text-xs text-muted">
            Analysis
          </label>
          <select
            id="state"
            name="state"
            defaultValue={selectValue(state ?? "")}
            className="h-9 rounded-md border border-line bg-surface px-2 text-sm"
          >
            <option value="">Any</option>
            <option value="done">analyzed</option>
            <option value="pending">queued</option>
            <option value="none">not queued</option>
            <option value="failed">failed</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sort" className="text-xs text-muted">
            Sort
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={selectValue(sortByFit ? "fit" : "")}
            className="h-9 rounded-md border border-line bg-surface px-2 text-sm"
          >
            <option value="">newest first</option>
            <option value="fit">best fit first</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="h-9 rounded-md bg-ink px-4 text-sm font-medium text-white hover:bg-black"
          >
            Apply filters
          </button>
          {hasFilters ? (
            <Link
              href="/jobs"
              className="h-9 rounded-md border border-line px-4 py-2 text-sm text-muted hover:text-ink"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {jobs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">
          No jobs match these filters.{" "}
          <Link href="/" className="font-medium text-accent-strong hover:underline">
            Fetch the fixture catalog
          </Link>{" "}
          or clear the filters.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {jobs.map((job) => {
            const record = analyses.get(job.id);
            return (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-4 py-3 hover:bg-paper"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{job.title}</p>
                    <p className="truncate text-sm text-muted">
                      {job.company.name} · {formatLocation(job.location)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {record ? (
                      <FitBadge classification={record.analysis.classification} />
                    ) : (
                      <FitStateBadge state={job.analysisState ?? "none"} />
                    )}
                    {job.salary ? (
                      <span className="font-mono text-xs text-muted">
                        {formatSalary(job.salary)}
                      </span>
                    ) : null}
                    <RemoteBadge remoteType={job.remoteType} />
                    <SourceBadge source={job.source} />
                    <time
                      className="font-mono text-xs text-muted"
                      dateTime={job.discoveredAt.toISOString()}
                    >
                      {job.discoveredAt.toLocaleDateString("en-GB")}
                    </time>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
