"use client";

import { useActionState, useState } from "react";
import type { SaveProfileInput } from "@/application/profile/save-profile";
import { importProfileFromCvAction } from "@/app/_lib/actions";
import type { ImportCvState } from "@/app/_lib/schemas";
import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import { ProfileForm } from "./profile-form";

const initialImport: ImportCvState = {};

export function ProfileWorkspace({ profile }: { profile?: CandidateProfile }) {
  const [importState, importAction, importPending] = useActionState(
    importProfileFromCvAction,
    initialImport,
  );
  const [appliedImport, setAppliedImport] = useState<ImportCvState>(importState);
  const [draft, setDraft] = useState<SaveProfileInput | undefined>(profile);
  const [imported, setImported] = useState(false);

  if (importState !== appliedImport) {
    setAppliedImport(importState);
    if (importState.draft) {
      setDraft(importState.draft);
      setImported(true);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Import from CV" className="rounded-lg border border-line bg-surface p-4">
        <h2 className="text-sm font-medium">Import from your CV</h2>
        <p className="mt-1 text-xs text-muted">
          Upload a PDF with selectable text, in any language. Nothing is saved until you review the
          result and press Save profile below.
        </p>
        <form action={importAction} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="cv-file" className="text-xs text-muted">
              CV file (PDF, max 3 MB)
            </label>
            <input
              id="cv-file"
              type="file"
              name="cv"
              accept="application/pdf,.pdf"
              required
              className="block text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-paper file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-line/40"
            />
          </div>
          <button
            type="submit"
            disabled={importPending}
            className="h-9 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60"
          >
            {importPending ? "Reading CV…" : "Extract profile"}
          </button>
          {importState.error ? (
            <p role="alert" className="w-full text-sm text-danger">
              {importState.error}
            </p>
          ) : null}
        </form>
      </section>

      <ProfileForm key={imported ? "imported" : "initial"} profile={draft} imported={imported} />
    </div>
  );
}
