import type { Metadata } from "next";
import { candidateProfileRepository, uploadedCvRepository } from "../_lib/container";
import { formatDate } from "../_lib/format";
import { ProfileWorkspace } from "./profile-workspace";

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
    </div>
  );
}
