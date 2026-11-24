import type { Metadata } from "next";
import Link from "next/link";
import { candidateProfileRepository } from "@/app/_lib/container";
import { normalizeCvLayout } from "@/domain/candidate/cv-layout";
import { normalizeCvTemplate } from "@/domain/candidate/cv-template";
import { toJsonResume } from "@/domain/candidate/json-resume";
import { BuilderPanel } from "./builder-panel";

export const metadata: Metadata = { title: "CV builder" };

export default async function CvBuilderPage() {
  const profile = await candidateProfileRepository.findFirst();

  if (!profile) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <h1 className="text-2xl font-semibold">CV builder</h1>
        <p className="text-sm text-muted">
          No profile yet — save one in the{" "}
          <Link href="/profile" className="text-accent-strong hover:underline">
            profile page
          </Link>{" "}
          first; the template builds on that data.
        </p>
      </div>
    );
  }

  const config = normalizeCvTemplate(profile.cvTemplate);
  const resume = toJsonResume(profile, config);
  const layout = normalizeCvLayout(profile.cvLayout);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">CV builder</h1>
          <p className="text-sm text-muted">
            One template over your data — choose what shows; the printed PDF is exactly this.
            Section order, visibility and header names are edited in the{" "}
            <Link href="/profile" className="text-accent-strong hover:underline">
              profile page
            </Link>
            .
          </p>
        </div>
        <a
          href="/cv"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-strong"
        >
          View /cv ↗
        </a>
      </header>

      <BuilderPanel resume={resume} config={config} layout={layout} />
    </div>
  );
}
