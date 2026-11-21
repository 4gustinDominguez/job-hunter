"use client";

/* oxlint-disable jsx-no-new-function-as-prop -- moving/toggling rows must close over the local layout state; this component renders on interaction, not in a hot loop */

import { useActionState, useState } from "react";
import { saveCvLayoutAction } from "@/app/_lib/actions";
import type { CvLayoutState } from "@/app/_lib/schemas";
import { CV_SECTION_LABELS, type CvLayout } from "@/domain/candidate/cv-layout";

const initialState: CvLayoutState = { message: "" };

const buttonClass =
  "rounded border border-line px-2 py-1 text-sm leading-none text-muted hover:text-ink disabled:opacity-40 disabled:hover:text-muted";

export function CvLayoutEditor({ layout }: { layout: CvLayout }) {
  const [state, formAction, pending] = useActionState(saveCvLayoutAction, initialState);
  const [entries, setEntries] = useState<CvLayout>(layout);

  const move = (index: number, delta: number): void => {
    setEntries((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const moved = next[index];
      next[index] = next[target];
      next[target] = moved;
      return next;
    });
  };

  const toggle = (index: number): void => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, visible: !entry.visible } : entry)),
    );
  };

  // Empty title = the section's default label (normalize drops it on save).
  const setTitle = (index: number, title: string): void => {
    setEntries((prev) => prev.map((entry, i) => (i === index ? { ...entry, title } : entry)));
  };

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <input type="hidden" name="layout" value={JSON.stringify(entries)} />
      <ul className="flex flex-col gap-1.5">
        {entries.map((entry, index) => {
          const defaultLabel = CV_SECTION_LABELS[entry.section];
          return (
            <li
              key={entry.section}
              className={`flex flex-wrap items-center gap-2 rounded-md border border-line px-3 py-2 ${
                entry.visible ? "bg-paper" : "bg-paper/40 opacity-60"
              }`}
            >
              <input
                type="text"
                value={entry.title ?? ""}
                placeholder={defaultLabel}
                aria-label={`Title of the ${defaultLabel} section`}
                onChange={(event) => setTitle(index, event.target.value)}
                className="h-8 min-w-40 flex-1 rounded border border-line bg-surface px-2 text-sm"
              />
              {!entry.visible ? (
                <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">
                  hidden
                </span>
              ) : null}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${defaultLabel} up`}
                  title="Move up"
                  className={buttonClass}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === entries.length - 1}
                  aria-label={`Move ${defaultLabel} down`}
                  title="Move down"
                  className={buttonClass}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-label={`${entry.visible ? "Hide" : "Show"} ${defaultLabel}`}
                  title={entry.visible ? "Hide section" : "Show section"}
                  className={buttonClass}
                >
                  {entry.visible ? "Hide" : "Show"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md bg-ink px-4 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save layout"}
        </button>
        {state.message ? <output className="text-xs text-muted">{state.message}</output> : null}
      </div>
    </form>
  );
}
