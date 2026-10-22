"use client";

import { useActionState } from "react";
import { generateApplicationDocumentAction } from "@/app/_lib/actions";
import type { DocumentActionState } from "@/app/_lib/schemas";
import { DOCUMENT_KINDS, type DocumentKind } from "@/domain/documents/generated-document";

const initialState: DocumentActionState = { message: "" };

const KIND_LABELS: Record<DocumentKind, string> = {
  COVER_LETTER: "cover letter",
  TAILORED_CV: "tailored CV",
};

export function GenerateDocButtons({
  applicationId,
  coverLetterExists,
  tailoredCvExists,
}: {
  applicationId: string;
  coverLetterExists: boolean;
  tailoredCvExists: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    generateApplicationDocumentAction,
    initialState,
  );
  const present: DocumentKind[] = [];
  if (coverLetterExists) present.push("COVER_LETTER");
  if (tailoredCvExists) present.push("TAILORED_CV");
  const missing = DOCUMENT_KINDS.filter((kind) => !present.includes(kind));
  if (missing.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 print:hidden">
        {missing.map((kind) => (
          <form key={kind} action={formAction}>
            <input type="hidden" name="applicationId" value={applicationId} />
            <input type="hidden" name="kind" value={kind} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-strong disabled:opacity-60"
            >
              {pending ? "Generating…" : `Generate ${KIND_LABELS[kind]}`}
            </button>
          </form>
        ))}
      </div>
      {state.message ? (
        <output
          aria-live="polite"
          className={`text-xs ${state.error ? "text-danger" : "text-accent-strong"}`}
        >
          {state.message}
        </output>
      ) : null}
    </div>
  );
}
