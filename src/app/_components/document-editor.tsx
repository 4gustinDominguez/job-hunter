"use client";

/* oxlint-disable jsx-no-new-function-as-prop -- the editor's onChange/onClick must close over local content state; these client components render on interaction, not in a hot loop */

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  generateApplicationDocumentAction,
  saveApplicationDocumentAction,
} from "@/app/_lib/actions";
import type { DocumentKind } from "@/domain/documents/generated-document";

const KIND_LABELS: Record<DocumentKind, string> = {
  COVER_LETTER: "Cover letter",
  TAILORED_CV: "Tailored CV",
};

function printPage(): void {
  window.print();
}

function confirmRegenerate(event: FormEvent<HTMLFormElement>): void {
  if (!window.confirm("Regenerate? The current content will be replaced.")) {
    event.preventDefault();
  }
}

export function DocumentEditor({
  applicationId,
  kind,
  initialContent,
  provider,
  model,
  generatedAt,
  warnings,
}: {
  applicationId: string;
  kind: DocumentKind;
  initialContent: string;
  provider: string;
  model: string;
  generatedAt: string;
  warnings: readonly string[];
}) {
  const [content, setContent] = useState(initialContent);
  const [copied, setCopied] = useState(false);
  const [saveState, saveAction, saving] = useActionState(saveApplicationDocumentAction, {
    message: "",
  });
  const [genState, genAction, regenerating] = useActionState(generateApplicationDocumentAction, {
    message: "",
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const handleContentChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setContent(event.target.value);
  };
  const handleCopy = (): void => {
    void copyToClipboard();
  };

  return (
    <section
      aria-label={`${KIND_LABELS[kind]} document`}
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-muted">{KIND_LABELS[kind]}</h3>
        <span className="font-mono text-xs text-muted">
          {provider}/{model} · {generatedAt}
        </span>
      </div>

      <p className="rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-warn">
        Draft — review before using it. Nothing is ever submitted automatically.
      </p>

      {warnings.length > 0 ? (
        <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
          Possible unsupported claims (verify they exist in your profile or this offer):{" "}
          {warnings.join(", ")}
        </p>
      ) : null}

      <label htmlFor={`doc-${kind}`} className="sr-only">
        Edit the {KIND_LABELS[kind].toLowerCase()}
      </label>
      <textarea
        id={`doc-${kind}`}
        name="content"
        value={content}
        onChange={handleContentChange}
        rows={18}
        className="w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm leading-relaxed"
      />
      {/* Print view: textareas clip when printed, this pre-wrap block replaces them. */}
      <div className="hidden whitespace-pre-wrap text-sm leading-relaxed print:block">
        {content}
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <form action={saveAction}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="content" value={content} />
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-strong"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button
          type="button"
          onClick={printPage}
          className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-strong"
        >
          Print / PDF
        </button>
        <form action={genAction} onSubmit={confirmRegenerate}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="kind" value={kind} />
          <button
            type="submit"
            disabled={regenerating}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-strong disabled:opacity-60"
          >
            {regenerating ? "Regenerating…" : "Regenerate"}
          </button>
        </form>
      </div>

      {saveState.message || genState.message ? (
        <output aria-live="polite" className="text-xs text-accent-strong">
          {saveState.message || genState.message}
        </output>
      ) : null}
    </section>
  );
}
