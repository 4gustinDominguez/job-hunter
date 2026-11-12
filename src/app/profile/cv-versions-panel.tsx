"use client";

/* oxlint-disable jsx-no-new-function-as-prop -- the Load confirm dialog must close over its own version; this component renders on interaction, not in a hot loop */

import { useActionState } from "react";
import { loadCvVersionAction, saveCvVersionAction } from "@/app/_lib/actions";
import { formatDate } from "@/app/_lib/format";
import type { CvVersionsState } from "@/app/_lib/schemas";

const initialSave: CvVersionsState = { message: "" };
const initialLoad: CvVersionsState = { message: "" };

const buttonClass =
  "h-9 rounded-md bg-ink px-4 text-sm font-medium text-white hover:bg-black disabled:opacity-60";
const loadButtonClass =
  "h-7 rounded-md border border-line px-3 text-xs font-medium text-muted hover:text-ink disabled:opacity-60";

export interface CvVersionRow {
  id: string;
  label: string;
  createdAt: Date;
}

export function CvVersionsPanel({ versions }: { versions: CvVersionRow[] }) {
  const [saveState, saveAction, savePending] = useActionState(saveCvVersionAction, initialSave);
  const [loadState, loadAction, loadPending] = useActionState(loadCvVersionAction, initialLoad);

  return (
    <div className="mt-3 flex flex-col gap-3">
      <form action={saveAction} className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-56 flex-col gap-1">
          <label htmlFor="cv-version-label" className="text-xs text-muted">
            Label
          </label>
          <input
            id="cv-version-label"
            name="label"
            placeholder="e.g. Backend-focused version"
            className="h-9 rounded-md border border-line bg-paper px-3 text-sm"
          />
        </div>
        <button type="submit" disabled={savePending} className={buttonClass}>
          {savePending ? "Saving…" : "Save version"}
        </button>
        {saveState.message ? (
          <output className="text-xs text-muted">{saveState.message}</output>
        ) : null}
      </form>

      {versions.length === 0 ? (
        <p className="text-xs text-muted">
          No versions yet — save one to be able to roll the CV back later.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {versions.map((version) => (
            <li
              key={version.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line bg-paper px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{version.label}</span>
              <time
                className="font-mono text-xs text-muted"
                dateTime={version.createdAt.toISOString()}
              >
                {formatDate(version.createdAt)}
              </time>
              <form
                action={loadAction}
                onSubmit={(event) => {
                  if (!confirm(`Load "${version.label}"? This replaces the current CV texts.`)) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="versionId" value={version.id} />
                <button type="submit" disabled={loadPending} className={loadButtonClass}>
                  {loadPending ? "Loading…" : "Load"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {loadState.message ? (
        <output className="text-xs text-muted">{loadState.message}</output>
      ) : null}
    </div>
  );
}
