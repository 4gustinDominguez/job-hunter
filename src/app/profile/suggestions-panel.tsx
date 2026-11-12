"use client";

/* oxlint-disable jsx-no-new-function-as-prop -- textarea drafts and per-row submit handling must close over their row; this component renders on interaction, not in a hot loop */

import { useActionState, useState } from "react";
import { resolveProfileSuggestionAction, reviewProfileTextsAction } from "@/app/_lib/actions";
import type { SuggestionsState } from "@/app/_lib/schemas";
import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import type { ProfileSuggestion } from "@/domain/candidate/profile-suggestion";
import { parseSuggestionPath, type ItemSuggestionPath } from "@/domain/candidate/suggestion-path";

const initialReview: SuggestionsState = { message: "" };
const initialResolve: SuggestionsState = { message: "" };

function itemLabel(profile: CandidateProfile, path: ItemSuggestionPath): string {
  if (path.collection === "experience") {
    const item = profile.experience.find((entry) => entry.id === path.itemId);
    return item ? `${item.position} — ${item.company}` : "removed item";
  }
  if (path.collection === "projects") {
    const item = profile.projects.find((entry) => entry.id === path.itemId);
    return item ? item.name : "removed item";
  }
  const item = profile.education.find((entry) => entry.id === path.itemId);
  return item ? item.degree : "removed item";
}

function pathLabel(path: string, profile: CandidateProfile): string {
  const parsed = parseSuggestionPath(path);
  if (!parsed) return path;
  if (parsed.collection === "summary") return "Summary";
  const what =
    parsed.field === "description"
      ? "description"
      : parsed.field === "achievements"
        ? `achievement ${(parsed.index ?? 0) + 1}`
        : `highlight ${(parsed.index ?? 0) + 1}`;
  return `${itemLabel(profile, parsed)} · ${what}`;
}

function MessageOutput({ state }: { state: SuggestionsState }) {
  if (!state.message) return null;
  return (
    <output className={`text-xs ${state.error ? "text-danger" : "text-muted"}`}>
      {state.message}
    </output>
  );
}

export function SuggestionsPanel({
  profile,
  suggestions,
}: {
  profile: CandidateProfile;
  suggestions: ProfileSuggestion[];
}) {
  const [reviewState, reviewAction, reviewPending] = useActionState(
    reviewProfileTextsAction,
    initialReview,
  );
  const [resolveState, resolveAction, resolvePending] = useActionState(
    resolveProfileSuggestionAction,
    initialResolve,
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const draftFor = (suggestion: ProfileSuggestion): string =>
    drafts[suggestion.id] ?? suggestion.proposedText;

  return (
    <div className="mt-3 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <form action={reviewAction}>
          <button
            type="submit"
            disabled={reviewPending}
            className="h-9 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60"
          >
            {reviewPending ? "Reviewing…" : "Review my CV"}
          </button>
        </form>
        <MessageOutput state={reviewState} />
        <MessageOutput state={resolveState} />
      </div>
      {reviewPending ? (
        <p className="text-xs text-muted">
          Reading and comparing every CV text — this can take up to a minute.
        </p>
      ) : null}

      {suggestions.length === 0 ? (
        <p className="text-xs text-muted">
          No suggestions pending — run a review to get improvement proposals.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              className="flex flex-col gap-2 rounded-lg border border-line bg-paper p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[10px] font-medium tracking-wide text-accent-strong uppercase">
                  {suggestion.category}
                </span>
                <span className="min-w-0 truncate text-xs font-medium">
                  {pathLabel(suggestion.path, profile)}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] tracking-wide text-muted uppercase">Current</span>
                <p className="border-l-2 border-line pl-2 text-xs whitespace-pre-line text-muted">
                  {suggestion.originalText}
                </p>
              </div>

              <form action={resolveAction} className="flex flex-col gap-2">
                <label
                  htmlFor={`suggested-text-${suggestion.id}`}
                  className="text-[10px] tracking-wide text-muted uppercase"
                >
                  Proposed — edit before applying if you want
                </label>
                <textarea
                  id={`suggested-text-${suggestion.id}`}
                  name="text"
                  rows={4}
                  value={draftFor(suggestion)}
                  onChange={(event) =>
                    setDrafts((prev) => ({ ...prev, [suggestion.id]: event.target.value }))
                  }
                  className="min-h-20 w-full rounded-md border border-line bg-surface p-2 text-sm leading-relaxed"
                />
                <p className="text-xs italic text-muted">{suggestion.reason}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    name="acceptId"
                    value={suggestion.id}
                    disabled={resolvePending}
                    className="h-8 rounded-md bg-accent px-3 text-xs font-medium text-white hover:bg-accent-strong disabled:opacity-60"
                  >
                    Apply
                  </button>
                  <button
                    type="submit"
                    name="dismissId"
                    value={suggestion.id}
                    disabled={resolvePending}
                    className="h-8 rounded-md border border-line px-3 text-xs text-muted hover:text-ink disabled:opacity-60"
                  >
                    Dismiss
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
