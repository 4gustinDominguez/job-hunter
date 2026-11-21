import type { Metadata } from "next";
import {
  candidateProfileRepository,
  cvVersionRepository,
  profileSuggestionRepository,
  uploadedCvRepository,
} from "../_lib/container";
import { formatDate } from "../_lib/format";
import { normalizeCvLayout } from "@/domain/candidate/cv-layout";
import type { ProfileSuggestion } from "@/domain/candidate/profile-suggestion";
import { CvLayoutEditor } from "./cv-layout-editor";
import { CvVersionsPanel, type CvVersionRow } from "./cv-versions-panel";
import { ProfileWorkspace } from "./profile-workspace";
import { SuggestionsPanel } from "./suggestions-panel";
import { AtsPanel } from "./ats-panel";

const NO_VERSIONS: CvVersionRow[] = [];
const NO_SUGGESTIONS: ProfileSuggestion[] = [];

export const metadata: Metadata = { title: "Profile" };

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default async function ProfilePage() {
  const [profile, cv] = await Promise.all([
    candidateProfileRepository.findFirst(),
    uploadedCvRepository.get(),
  ]);
  const versions = profile ? await cvVersionRepository.listByProfile(profile.id) : NO_VERSIONS;
  const suggestions = profile
    ? await profileSuggestionRepository.listPending(profile.id)
    : NO_SUGGESTIONS;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-sm text-muted">
            Your professional data — the source of truth for applications.
          </p>
        </div>
        <a
          href="/cv"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-strong"
        >
          View public CV ↗
        </a>
      </header>

      <section
        aria-label="CV on file"
        className="rounded-lg border border-line bg-surface p-4 print:hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-muted">CV on file</h2>
            {cv ? (
              <p className="mt-1 truncate text-sm">
                <span className="font-medium">{cv.filename}</span>{" "}
                <span className="text-muted">
                  · {formatSize(cv.size)} · uploaded {formatDate(cv.uploadedAt)}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">
                No PDF on record yet — import your CV above and the file is kept here for viewing.
              </p>
            )}
          </div>
          {cv ? (
            <div className="flex shrink-0 gap-2">
              <a
                href="/api/cv"
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-strong"
              >
                View PDF
              </a>
              <a
                href="/api/cv?download=1"
                className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-strong"
              >
                Download
              </a>
            </div>
          ) : null}
        </div>
      </section>

      <ProfileWorkspace profile={profile ?? undefined} />

      {profile ? (
        <section
          aria-label="CV layout"
          className="rounded-lg border border-line bg-surface p-4 print:hidden"
        >
          <h2 className="text-sm font-medium">CV layout</h2>
          <p className="mt-1 text-xs text-muted">
            Section order of the public{" "}
            <a
              href="/cv"
              target="_blank"
              rel="noreferrer"
              className="text-accent-strong hover:underline"
            >
              /cv
            </a>{" "}
            page and of the PDF it prints. Hidden sections are left out of both.
          </p>
          <CvLayoutEditor layout={normalizeCvLayout(profile.cvLayout)} />
        </section>
      ) : null}

      {profile ? (
        <section
          aria-label="CV versions"
          className="rounded-lg border border-line bg-surface p-4 print:hidden"
        >
          <h2 className="text-sm font-medium">CV versions</h2>
          <p className="mt-1 text-xs text-muted">
            Snapshots of the <strong>saved</strong> CV — save the form first if you just edited it.
            Loading one restores its texts, skills and layout; job preferences are never touched.
          </p>
          <CvVersionsPanel versions={versions} />
        </section>
      ) : null}

      {profile ? (
        <section
          aria-label="Suggestions"
          className="rounded-lg border border-line bg-surface p-4 print:hidden"
        >
          <h2 className="text-sm font-medium">CV suggestions</h2>
          <p className="mt-1 text-xs text-muted">
            &quot;Review my CV&quot; has the LLM read your saved texts for grammar, style, clarity
            and impact — never inventing facts. Apply writes the chosen text into your profile.
          </p>
          <SuggestionsPanel profile={profile} suggestions={suggestions} />
        </section>
      ) : null}

      {profile ? (
        <section
          aria-label="ATS check"
          className="rounded-lg border border-line bg-surface p-4 print:hidden"
        >
          <h2 className="text-sm font-medium">ATS check</h2>
          <p className="mt-1 text-xs text-muted">
            Scores your exported CV (contact, experience, education, skills, keywords, dates) and
            what an applicant tracking system actually reads in the PDF you upload.
          </p>
          <AtsPanel />
        </section>
      ) : null}
    </div>
  );
}
