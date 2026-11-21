import type { Metadata } from "next";
import Link from "next/link";
import { ClassicTemplate } from "../_components/cv-templates/classic";
import { PrintButton } from "../_components/print-button";
import { candidateProfileRepository } from "../_lib/container";
import { normalizeCvLayout, CV_SECTION_LABELS } from "@/domain/candidate/cv-layout";
import { normalizeCvTemplate } from "@/domain/candidate/cv-template";
import { toJsonResume } from "@/domain/candidate/json-resume";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await candidateProfileRepository.findFirst();
  const name = profile?.name?.trim();
  return { title: name ? `${name} — CV` : "CV" };
}

export default async function PublicCvPage() {
  const profile = await candidateProfileRepository.findFirst();

  if (!profile) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">No CV published yet</h1>
        <p className="text-sm text-muted">
          Import your CV from the{" "}
          <Link href="/profile" className="text-accent-strong hover:underline">
            profile page
          </Link>{" "}
          to publish it here.
        </p>
      </div>
    );
  }

  const resume = toJsonResume(profile);
  const config = normalizeCvTemplate(profile.cvTemplate);
  const layout = normalizeCvLayout(profile.cvLayout);

  const hasAnyContent = Boolean(
    resume.basics.summary ||
    resume.work.length > 0 ||
    resume.skills.length > 0 ||
    resume.projects.length > 0 ||
    resume.education.length > 0,
  );
  const originalPdfEntry = layout.find((entry) => entry.section === "original-pdf");
  const originalPdfTitle = originalPdfEntry?.title || CV_SECTION_LABELS["original-pdf"];
  const showOriginalPdf = originalPdfEntry?.visible ?? true;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 px-4 py-10 md:px-6 print:gap-8 print:px-0 print:py-0">
      <div className="flex flex-wrap gap-2 print:hidden">
        <a
          href="/cv/pdf"
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-strong"
        >
          View original PDF
        </a>
        <a
          href="/cv/pdf?download=1"
          className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-strong"
        >
          Download original PDF
        </a>
        <PrintButton />
      </div>

      <ClassicTemplate resume={resume} config={config} layout={layout} />

      {!hasAnyContent ? (
        <p className="text-sm text-muted">
          This profile has no structured content yet — only the PDF below is available.
        </p>
      ) : null}

      {showOriginalPdf ? (
        <section aria-label={originalPdfTitle} className="flex flex-col gap-3 print:hidden">
          <h2 className="border-b border-line pb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            {originalPdfTitle}
          </h2>
          <div className="flex flex-col gap-2">
            <object
              data="/cv/pdf"
              type="application/pdf"
              aria-label="Original CV (PDF)"
              className="h-[80vh] w-full rounded-lg border border-line"
            >
              <p className="p-4 text-sm text-muted">
                Your browser can&apos;t display the PDF inline.{" "}
                <a href="/cv/pdf" className="text-accent-strong hover:underline">
                  Open it in a new tab
                </a>
                .
              </p>
            </object>
          </div>
        </section>
      ) : null}
    </div>
  );
}
