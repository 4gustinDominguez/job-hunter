import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "../_components/print-button";
import { candidateProfileRepository } from "../_lib/container";
import { formatDateRange, formatLocation } from "../_lib/format";
import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import { SKILL_CATEGORY_LABELS, SKILL_CATEGORY_ORDER } from "@/domain/candidate/skill";
import { CV_SECTION_LABELS, normalizeCvLayout, type CvSection } from "@/domain/candidate/cv-layout";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await candidateProfileRepository.findFirst();
  const name = profile?.name?.trim();
  return { title: name ? `${name} — CV` : "CV" };
}

function Section({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className={`flex flex-col gap-3 ${className ?? ""}`}>
      <h2 className="border-b border-line pb-2 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SkillChips({ skills }: { skills: { id: string; name: string }[] }) {
  return (
    <ul className="cv-skills flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <li
          key={skill.id}
          className="rounded-full border border-line bg-paper px-2.5 py-0.5 text-xs text-muted"
        >
          {skill.name}
        </li>
      ))}
    </ul>
  );
}

function ExperienceItem({ item }: { item: CandidateProfile["experience"][number] }) {
  return (
    <article className="flex flex-col gap-1.5 print:break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="font-medium">{item.position}</h3>
        <time className="font-mono text-xs text-muted whitespace-nowrap">
          {formatDateRange(item.startDate, item.endDate)}
        </time>
      </div>
      <p className="text-sm text-accent-strong">{item.company}</p>
      {item.description ? (
        <p className="max-w-[72ch] text-sm leading-relaxed whitespace-pre-line text-ink/90">
          {item.description}
        </p>
      ) : null}
      {item.achievements.length > 0 ? (
        <ul className="flex max-w-[72ch] flex-col gap-1 text-sm text-ink/90">
          {item.achievements.map((achievement) => (
            <li key={achievement} className="flex gap-2">
              <span aria-hidden="true" className="text-accent">
                ✓
              </span>
              <span>{achievement}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {item.skills.length > 0 ? (
        <p className="text-xs text-muted">Used: {item.skills.join(" · ")}</p>
      ) : null}
    </article>
  );
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

  const skillsByCategory = SKILL_CATEGORY_ORDER.map((category) => ({
    category,
    label: SKILL_CATEGORY_LABELS[category],
    items: profile.skills.filter((skill) => skill.category === category),
  })).filter((group) => group.items.length > 0);

  const hasAnyContent =
    profile.summary ||
    profile.experience.length > 0 ||
    profile.skills.length > 0 ||
    profile.projects.length > 0 ||
    profile.education.length > 0;

  // Content per section — the layout below decides order and visibility, and
  // sections without content stay out of the page entirely.
  const sectionNodes: Partial<Record<CvSection, React.ReactNode>> = {
    summary: profile.summary ? (
      <p className="max-w-[72ch] text-sm leading-relaxed whitespace-pre-line text-ink/90">
        {profile.summary}
      </p>
    ) : undefined,
    skills:
      skillsByCategory.length > 0 ? (
        <div className="flex flex-col gap-4">
          {skillsByCategory.map((group) => (
            <div key={group.category} className="flex flex-col gap-2">
              <h3 className="text-xs font-medium text-muted">{group.label}</h3>
              <SkillChips skills={group.items} />
            </div>
          ))}
        </div>
      ) : undefined,
    experience:
      profile.experience.length > 0 ? (
        <div className="flex flex-col gap-6">
          {[...profile.experience]
            .toSorted((a, b) => b.startDate.getTime() - a.startDate.getTime())
            .map((item) => (
              <ExperienceItem key={item.id} item={item} />
            ))}
        </div>
      ) : undefined,
    projects:
      profile.projects.length > 0 ? (
        <div className="flex flex-col gap-5">
          {profile.projects.map((project) => (
            <article key={project.id} className="flex flex-col gap-1.5 print:break-inside-avoid">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 className="font-medium">{project.name}</h3>
                {project.url ? (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-accent-strong hover:underline"
                  >
                    {project.url}
                  </a>
                ) : null}
              </div>
              <p className="max-w-[72ch] text-sm leading-relaxed text-ink/90">
                {project.description}
              </p>
              {project.technologies.length > 0 ? (
                <p className="text-xs text-muted">Built with: {project.technologies.join(" · ")}</p>
              ) : null}
              {project.highlights.length > 0 ? (
                <ul className="flex max-w-[72ch] flex-col gap-1 text-sm text-ink/90">
                  {project.highlights.map((highlight) => (
                    <li key={highlight} className="flex gap-2">
                      <span aria-hidden="true" className="text-accent">
                        ✓
                      </span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      ) : undefined,
    education:
      profile.education.length > 0 ? (
        <div className="flex flex-col gap-4">
          {[...profile.education]
            .toSorted((a, b) => b.startDate.getTime() - a.startDate.getTime())
            .map((item) => (
              <article key={item.id} className="flex flex-col gap-1 print:break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="font-medium">{item.degree}</h3>
                  <time className="font-mono text-xs text-muted whitespace-nowrap">
                    {formatDateRange(item.startDate, item.endDate)}
                  </time>
                </div>
                <p className="text-sm text-accent-strong">{item.institution}</p>
                <p className="text-sm text-muted">{item.field}</p>
                {item.achievements && item.achievements.length > 0 ? (
                  <p className="text-xs text-muted">{item.achievements.join(" · ")}</p>
                ) : null}
              </article>
            ))}
        </div>
      ) : undefined,
    // Original PDF — embedded last so the structured CV stays front-and-centre.
    "original-pdf": (
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
    ),
  };

  const layout = normalizeCvLayout(profile.cvLayout);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 px-4 py-10 md:px-6 print:gap-8 print:px-0 print:py-0">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold wrap-anywhere print:text-2xl">{profile.name}</h1>
        {profile.location && profile.location.isRemote ? (
          <p className="text-sm text-muted">Remote</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span>{formatLocation(profile.location)}</span>
          <a href={`mailto:${profile.email}`} className="hover:text-ink">
            {profile.email}
          </a>
          {profile.phone ? (
            <a href={`tel:${profile.phone}`} className="hover:text-ink">
              {profile.phone}
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 pt-1 print:hidden">
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
      </header>

      {!hasAnyContent ? (
        <p className="text-sm text-muted">
          This profile has no structured content yet — only the PDF below is available.
        </p>
      ) : null}

      {layout
        .filter((entry) => entry.visible && sectionNodes[entry.section])
        .map((entry) => (
          <Section
            key={entry.section}
            title={entry.title ?? CV_SECTION_LABELS[entry.section]}
            className={entry.section === "original-pdf" ? "print:hidden" : undefined}
          >
            {sectionNodes[entry.section]}
          </Section>
        ))}
    </div>
  );
}
