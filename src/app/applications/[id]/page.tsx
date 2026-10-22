import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentEditor } from "../../_components/document-editor";
import { GenerateDocButtons } from "../../_components/generate-doc-buttons";
import { StatusBadge } from "../../_components/badges";
import {
  applicationRepository,
  candidateProfileRepository,
  documentRepository,
  getJob,
} from "../../_lib/container";
import { findUnsupportedClaims } from "@/application";
import { formatDate } from "../../_lib/format";
import { DOCUMENT_KINDS } from "@/domain/documents/generated-document";

const NO_WARNINGS: readonly string[] = [];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const application = await applicationRepository.getById(id);
  if (!application) return { title: "Application" };
  const job = await getJob.run(application.jobId);
  return { title: job ? `Docs · ${job.title}` : "Application" };
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const application = await applicationRepository.getById(id);
  if (!application) {
    notFound();
  }
  const [job, documents, profile] = await Promise.all([
    getJob.run(application.jobId),
    documentRepository.listByApplication(application.id),
    candidateProfileRepository.findFirst(),
  ]);
  if (!job) {
    notFound();
  }

  const byKind = new Map(documents.map((doc) => [doc.kind, doc]));
  const presentKinds = DOCUMENT_KINDS.filter((kind) => byKind.has(kind));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/applications" className="text-sm text-muted hover:text-ink">
        ← All applications
      </Link>

      <header className="flex flex-col gap-2 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={application.status} />
          {application.appliedAt ? (
            <span className="text-xs text-muted">applied {formatDate(application.appliedAt)}</span>
          ) : null}
        </div>
        <h1 className="text-2xl font-semibold">{job.title}</h1>
        <Link
          href={`/jobs/${job.id}`}
          className="text-sm font-medium text-accent-strong hover:underline"
        >
          {job.company.name} — view offer →
        </Link>
      </header>

      <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted print:hidden">
        Documents here are <strong>drafts generated from your profile and this offer</strong>.
        Review every line before sending — you are the last line of defense against anything the
        model got wrong.
      </p>

      <GenerateDocButtons
        applicationId={application.id}
        coverLetterExists={byKind.has("COVER_LETTER")}
        tailoredCvExists={byKind.has("TAILORED_CV")}
      />

      <div className="flex flex-col gap-5">
        {presentKinds.map((kind) => {
          const doc = byKind.get(kind);
          if (!doc) return null;
          const warnings = profile ? findUnsupportedClaims(doc.content, profile, job) : NO_WARNINGS;
          return (
            <DocumentEditor
              key={kind}
              applicationId={application.id}
              kind={kind}
              initialContent={doc.content}
              provider={doc.provider}
              model={doc.model}
              generatedAt={formatDate(doc.updatedAt)}
              warnings={warnings}
            />
          );
        })}
        {documents.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line bg-surface p-4 text-sm text-muted print:hidden">
            No documents yet. Generate a cover letter or a tailored CV above.
          </p>
        ) : null}
      </div>
    </div>
  );
}
