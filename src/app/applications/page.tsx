/* oxlint-disable react/no-array-index-key -- notes lists are append-only */
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "../_components/badges";
import { addNoteAction, transitionApplicationAction } from "../_lib/actions";
import { applicationRepository, getJob } from "../_lib/container";
import { formatDate } from "../_lib/format";
import { allowedTransitions } from "@/domain/application/status-machine";
import type { ApplicationStatus } from "@/domain/application/enums";

export const metadata: Metadata = { title: "Applications" };

function prettyStatus(status: ApplicationStatus): string {
  return status.toLowerCase().replace(/_/g, " ");
}

export default async function ApplicationsPage() {
  const applications = await applicationRepository.list();
  const jobs = await Promise.all(applications.map((app) => getJob.run(app.jobId)));
  const jobTitleById = new Map(
    applications.map((app, index) => [app.jobId, jobs[index]?.title ?? "Unknown job"]),
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Applications</h1>
        <p className="text-sm text-muted">{applications.length} in your pipeline</p>
      </header>

      {applications.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-muted">
          No applications yet. Open a{" "}
          <Link href="/jobs" className="font-medium text-accent-strong hover:underline">
            job
          </Link>{" "}
          and create one from its detail page.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {applications.map((app) => {
            const transitions = allowedTransitions(app.status);
            const title = jobTitleById.get(app.jobId);
            return (
              <li key={app.id} className="rounded-lg border border-line bg-surface">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/applications/${app.id}`}
                      className="block truncate font-medium hover:text-accent-strong"
                    >
                      {title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <StatusBadge status={app.status} />
                      {app.appliedAt ? <span>applied {formatDate(app.appliedAt)}</span> : null}
                      {app.nextActionAt ? <span>next: {formatDate(app.nextActionAt)}</span> : null}
                      {app.contact ? <span>contact: {app.contact.name}</span> : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 px-4 py-3">
                  {app.notes && app.notes.length > 0 ? (
                    <section aria-label="Notes">
                      <h2 className="mb-1.5 text-xs text-muted">Notes</h2>
                      <ul className="flex flex-col gap-1 text-sm">
                        {app.notes.map((note, index) => (
                          <li
                            key={`${app.id}-note-${index}`}
                            className="border-l-2 border-line pl-3"
                          >
                            {note}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  <div className="flex flex-wrap items-end gap-4">
                    {transitions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {transitions.map((next) => (
                          <form key={next} action={transitionApplicationAction}>
                            <input type="hidden" name="applicationId" value={app.id} />
                            <input type="hidden" name="next" value={next} />
                            <button
                              type="submit"
                              className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-strong"
                            >
                              Move to {prettyStatus(next)}
                            </button>
                          </form>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted">No further transitions.</p>
                    )}

                    <form action={addNoteAction} className="flex flex-1 items-end gap-2">
                      <input type="hidden" name="applicationId" value={app.id} />
                      <label htmlFor={`note-${app.id}`} className="sr-only">
                        Add a note
                      </label>
                      <input
                        id={`note-${app.id}`}
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
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
