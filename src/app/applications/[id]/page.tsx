import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ApplicationQuestions,
  type ResolvedSimilarityMatch,
  type SimilarityRow,
} from "../../_components/application-questions";
import { DocumentEditor } from "../../_components/document-editor";
import { GenerateDocButtons } from "../../_components/generate-doc-buttons";
import { StatusBadge } from "../../_components/badges";
import {
  applicationQuestionRepository,
  applicationRepository,
  candidateProfileRepository,
  documentRepository,
  getJob,
  questionSimilarityRepository,
} from "../../_lib/container";
import { findUnsupportedClaims } from "@/application";
import { formatDate } from "../../_lib/format";
import { DOCUMENT_KINDS } from "@/domain/documents/generated-document";

const NO_WARNINGS: readonly string[] = [];
const NO_SIMILARITY: Record<string, SimilarityRow> = {};

/**
 * Turn persisted similarity records into renderable rows: resolve each matched
 * questionId against the CURRENT question text/answer (answers may have been
 * edited since the analysis) and label the source offer as "Company — Title".
 * Matches whose question was deleted since are dropped.
 */
async function resolveSimilarity(questionIds: string[]): Promise<Record<string, SimilarityRow>> {
  const rows: Record<string, SimilarityRow> = {};
  if (questionIds.length === 0) return rows;

  const [records, answered] = await Promise.all([
    questionSimilarityRepository.getMany(questionIds),
    applicationQuestionRepository.listAnswered(undefined, 150),
  ]);

  const matchedIds = [
    ...new Set([...records.values()].flatMap((r) => r.matches.map((m) => m.questionId))),
  ];
  const matchedQuestions =
    matchedIds.length > 0 ? await applicationQuestionRepository.getMany(matchedIds) : [];
  const matchedById = new Map(matchedQuestions.map((q) => [q.id, q]));

  // Source labels: matched question → its application → its job/company.
  const sourceByQuestion = new Map<string, string>();
  const appIds = [...new Set(matchedQuestions.map((q) => q.applicationId))];
  const apps = await Promise.all(appIds.map((appId) => applicationRepository.getById(appId)));
  const jobIds = [...new Set(apps.filter((a) => a !== null).map((a) => a!.jobId))];
  const jobs = await Promise.all(jobIds.map((jobId) => getJob.run(jobId)));
  const jobById = new Map(jobs.filter((j) => j !== null).map((j) => [j!.id, j!]));
  for (const question of matchedQuestions) {
    const app = apps.find((a) => a?.id === question.applicationId);
    const matchedJob = app ? jobById.get(app.jobId) : undefined;
    sourceByQuestion.set(
      question.id,
      matchedJob ? `${matchedJob.company.name} — ${matchedJob.title}` : "Previous process",
    );
  }

  const answeredIds = new Set(answered.map((q) => q.id));
  for (const questionId of questionIds) {
    const record = records.get(questionId);
    const matches: ResolvedSimilarityMatch[] = (record?.matches ?? []).flatMap((match) => {
      const matched = matchedById.get(match.questionId);
      if (!matched) return [];
      return [
        {
          questionId: matched.id,
          reason: match.reason,
          question: matched.question,
          answer: matched.answer,
          source: sourceByQuestion.get(matched.id) ?? "Previous process",
        },
      ];
    });
    // Button shows when at least one OTHER answered question exists (incl. siblings).
    const otherAnswered = [...answeredIds].some((id) => id !== questionId);
    rows[questionId] = {
      hasAnalysis: record !== undefined,
      matches,
      canFindSimilar: otherAnswered,
    };
  }
  return rows;
}

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
  const [job, documents, profile, questions] = await Promise.all([
    getJob.run(application.jobId),
    documentRepository.listByApplication(application.id),
    candidateProfileRepository.findFirst(),
    application.status === "INTERESTED"
      ? applicationQuestionRepository.listByApplication(application.id)
      : Promise.resolve([]),
  ]);
  if (!job) {
    notFound();
  }

  const similarity =
    application.status === "INTERESTED" && questions.length > 0
      ? await resolveSimilarity(questions.map((question) => question.id))
      : NO_SIMILARITY;

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

      {application.status === "INTERESTED" ? (
        <ApplicationQuestions
          applicationId={application.id}
          questions={questions}
          similarity={similarity}
        />
      ) : null}

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
