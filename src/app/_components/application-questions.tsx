"use client";

/* oxlint-disable jsx-no-new-function-as-prop -- draft rows must close over their row key; this component renders on interaction, not in a hot loop */

import { useActionState, useState, type FormEvent, type MouseEvent } from "react";
import {
  addApplicationQuestionsAction,
  deleteApplicationQuestionAction,
  findSimilarQuestionsAction,
  saveApplicationQuestionAnswerAction,
} from "@/app/_lib/actions";
import type { ApplicationQuestionsState } from "@/app/_lib/schemas";
import type { ApplicationQuestion } from "@/domain/application/application-question";

interface DraftRow {
  key: string;
  question: string;
  answer: string;
}

/** A matched question from the corpus, resolved to its current text + source offer. */
export interface ResolvedSimilarityMatch {
  questionId: string;
  reason: string;
  question: string;
  answer?: string;
  /** "Company — Job title" of the offer where the match was answered. */
  source: string;
}

/** Per-question similarity state, resolved server-side by the detail page. */
export interface SimilarityRow {
  /** True when an analysis was run before (even if it found nothing). */
  hasAnalysis: boolean;
  matches: readonly ResolvedSimilarityMatch[];
  /** False when no other answered question exists — the button stays hidden. */
  canFindSimilar: boolean;
}

const TEXTAREA = "w-full rounded-md border border-line bg-paper px-3 py-2 text-sm leading-relaxed";
const PRIMARY_BUTTON =
  "rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-60";
const GHOST_BUTTON =
  "rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-strong";
const NO_SIMILARITY: SimilarityRow = {
  hasAnalysis: false,
  matches: [],
  canFindSimilar: false,
};

function confirmDelete(event: MouseEvent<HTMLButtonElement>): void {
  if (!window.confirm("Delete this question and its answer?")) {
    event.preventDefault();
  }
}

function MatchCard({ match }: { match: ResolvedSimilarityMatch }) {
  return (
    <li className="flex flex-col gap-1.5 border-l-2 border-accent pl-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <p className="text-sm font-medium leading-relaxed">{match.question}</p>
        <span className="shrink-0 text-[11px] text-muted">{match.source}</span>
      </div>
      {match.answer ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{match.answer}</p>
      ) : (
        <p className="text-xs text-muted italic">No answer recorded for this one.</p>
      )}
      <p className="text-xs italic text-accent-strong">{match.reason}</p>
    </li>
  );
}

function QuestionRow({
  question,
  similarity,
}: {
  question: ApplicationQuestion;
  similarity: SimilarityRow;
}) {
  const [state, saveAction, saving] = useActionState(saveApplicationQuestionAnswerAction, {
    message: "",
  });
  const [findState, findAction, finding] = useActionState(findSimilarQuestionsAction, {
    message: "",
  });

  const hasMatches = similarity.matches.length > 0;

  return (
    <li className="flex flex-col gap-2 rounded-md border border-line bg-paper p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm leading-relaxed">{question.question}</p>
        <form action={deleteApplicationQuestionAction}>
          <input type="hidden" name="questionId" value={question.id} />
          <button
            type="submit"
            onClick={confirmDelete}
            className="shrink-0 text-xs text-muted hover:text-danger"
          >
            Delete
          </button>
        </form>
      </div>
      <form action={saveAction} className="flex flex-col gap-2">
        <input type="hidden" name="questionId" value={question.id} />
        <label htmlFor={`answer-${question.id}`} className="sr-only">
          Answer to: {question.question}
        </label>
        <textarea
          id={`answer-${question.id}`}
          name="answer"
          defaultValue={question.answer ?? ""}
          rows={3}
          placeholder="Your answer…"
          className={TEXTAREA}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={saving} className={PRIMARY_BUTTON}>
            {saving ? "Saving…" : question.answer ? "Update answer" : "Save answer"}
          </button>
          {state.message ? (
            <output
              aria-live="polite"
              className={state.error ? "text-xs text-danger" : "text-xs text-muted"}
            >
              {state.message}
            </output>
          ) : null}
        </div>
      </form>

      {similarity.canFindSimilar ? (
        <form action={findAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="questionId" value={question.id} />
          <button type="submit" disabled={finding} className={GHOST_BUTTON}>
            {finding
              ? "Searching previous answers…"
              : hasMatches || similarity.hasAnalysis
                ? "Re-run similarity"
                : "Find similar"}
          </button>
          {findState.message ? (
            <output
              aria-live="polite"
              className={findState.error ? "text-xs text-danger" : "text-xs text-accent-strong"}
            >
              {findState.message}
            </output>
          ) : null}
        </form>
      ) : null}

      {hasMatches ? (
        <section aria-label="Similar previous questions" className="flex flex-col gap-2.5 pt-1">
          <h3 className="text-xs font-medium text-muted">
            Similar questions from previous processes ({similarity.matches.length})
          </h3>
          <ul className="flex flex-col gap-3">
            {similarity.matches.map((match) => (
              <MatchCard key={match.questionId} match={match} />
            ))}
          </ul>
        </section>
      ) : similarity.hasAnalysis && similarity.canFindSimilar ? (
        <p className="text-xs text-muted italic">
          No similar questions found among previous answers.
        </p>
      ) : null}
    </li>
  );
}

export function ApplicationQuestions({
  applicationId,
  questions,
  similarity,
}: {
  applicationId: string;
  questions: readonly ApplicationQuestion[];
  similarity: Record<string, SimilarityRow>;
}) {
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [addState, addAction, adding] = useActionState(addQuestions, {
    message: "",
  });

  // Wrap the server action so drafts are dropped only after a successful add
  // (a validation error keeps the rows on screen for fixing).
  async function addQuestions(
    prev: ApplicationQuestionsState,
    formData: FormData,
  ): Promise<ApplicationQuestionsState> {
    const result = await addApplicationQuestionsAction(prev, formData);
    if (!result.error) {
      setDrafts([]);
    }
    return result;
  }

  function addDraft(): void {
    setDrafts((current) => [...current, { key: crypto.randomUUID(), question: "", answer: "" }]);
  }

  function removeDraft(key: string): void {
    setDrafts((current) => current.filter((row) => row.key !== key));
  }

  function handleDraftChange(key: string, field: "question" | "answer", value: string): void {
    setDrafts((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  }

  function handleDraftSubmit(event: FormEvent<HTMLFormElement>): void {
    // Fully empty rows are noise — drop them before they hit the server.
    const meaningful = drafts.some((row) => row.question.trim() !== "" || row.answer.trim() !== "");
    if (!meaningful) {
      event.preventDefault();
    }
  }

  return (
    <section
      aria-label="Application questions"
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">Application questions</h2>
        <p className="text-xs text-muted">
          {questions.length > 0
            ? `${questions.length} question${questions.length === 1 ? "" : "s"}`
            : "The process asks these when you upload your CV — draft your answers here."}
        </p>
      </div>

      {questions.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {questions.map((question) => (
            <QuestionRow
              key={question.id}
              question={question}
              similarity={similarity[question.id] ?? NO_SIMILARITY}
            />
          ))}
        </ul>
      ) : null}

      <form action={addAction} onSubmit={handleDraftSubmit} className="flex flex-col gap-3">
        <input type="hidden" name="applicationId" value={applicationId} />

        {drafts.map((row) => (
          <div
            key={row.key}
            className="flex flex-col gap-2 rounded-md border border-dashed border-line bg-paper p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">New question</span>
              <button
                type="button"
                onClick={() => removeDraft(row.key)}
                className="text-xs text-muted hover:text-danger"
              >
                Remove
              </button>
            </div>
            <label htmlFor={`question-${row.key}`} className="sr-only">
              Question
            </label>
            <textarea
              id={`question-${row.key}`}
              name="question"
              value={row.question}
              onChange={(event) => handleDraftChange(row.key, "question", event.target.value)}
              rows={2}
              placeholder="e.g. How many years of professional frontend engineering experience do you have?"
              className={TEXTAREA}
            />
            <label htmlFor={`answer-${row.key}`} className="sr-only">
              Answer
            </label>
            <textarea
              id={`answer-${row.key}`}
              name="answer"
              value={row.answer}
              onChange={(event) => handleDraftChange(row.key, "answer", event.target.value)}
              rows={3}
              placeholder="Your answer (you can leave it blank and fill it in later)…"
              className={TEXTAREA}
            />
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={addDraft} className={GHOST_BUTTON}>
            + Add question
          </button>
          {drafts.length > 0 ? (
            <button type="submit" disabled={adding} className={PRIMARY_BUTTON}>
              {adding ? "Adding…" : "Save questions"}
            </button>
          ) : null}
          {addState.message ? (
            <output
              aria-live="polite"
              className={addState.error ? "text-xs text-danger" : "text-xs text-accent-strong"}
            >
              {addState.message}
            </output>
          ) : null}
        </div>
      </form>
    </section>
  );
}
