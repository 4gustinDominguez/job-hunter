import { CV_SECTION_LABELS, type CvLayout, type CvSection } from "@/domain/candidate/cv-layout";
import type { CvTemplateConfig } from "@/domain/candidate/cv-template";
import type { JsonResume } from "@/domain/candidate/json-resume";

interface ClassicTemplateProps {
  resume: JsonResume;
  config: CvTemplateConfig;
  layout: CvLayout;
}

const NO_HIGHLIGHTS: string[] = [];

/** "Mar 2021" — UTC-safe (ISO dates are date-only strings). */
function monthYear(iso: string): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

function dateRange(start: string, end?: string): string {
  return `${monthYear(start)} – ${end ? monthYear(end) : "Present"}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="border-b border-line pb-2 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Highlights({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex max-w-[72ch] flex-col gap-0.5 text-sm text-ink/90">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span aria-hidden="true" className="text-accent">
            ✓
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The single CV template: fixed typography/blocks, content decided by the
 * layout (order/visibility) and the config's per-field toggles. Pure — same
 * component renders /cv, the builder preview and the printed PDF.
 */
export function ClassicTemplate({ resume, config, layout }: ClassicTemplateProps) {
  const { basics } = resume;
  // Custom headline wins while typing in the builder preview; once saved,
  // resume.basics.label already carries it.
  const headline = config.headline.trim() || basics.label;

  const locationParts = [basics.location?.city, basics.location?.region, basics.location?.country]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  const locationText = [basics.location?.remote ? "Remote" : "", locationParts.join(", ")]
    .filter(Boolean)
    .join(" · ");

  const contact: React.ReactNode[] = [];
  if (config.fields.email && basics.email) {
    contact.push(
      <a key="email" href={`mailto:${basics.email}`} className="hover:text-ink">
        {basics.email}
      </a>,
    );
  }
  if (config.fields.phone && basics.phone) {
    contact.push(
      <a key="phone" href={`tel:${basics.phone}`} className="hover:text-ink">
        {basics.phone}
      </a>,
    );
  }
  if (config.fields.location && locationText) {
    contact.push(<span key="location">{locationText}</span>);
  }

  const photoUrl = config.fields.photo && config.imageUrl ? config.imageUrl : undefined;
  const photoShapeClass =
    config.photoShape === "round"
      ? "rounded-full"
      : config.photoShape === "rounded"
        ? "rounded"
        : "";
  const photoOnTop = config.photoPosition === "top";
  const photoNode = photoUrl ? (
    <img
      src={photoUrl}
      alt={basics.name}
      className={`${photoShapeClass} size-20 shrink-0 border border-line object-cover print:size-16`}
    />
  ) : null;

  // Sections without content stay out entirely; the layout decides the rest.
  const sectionNodes: Partial<Record<CvSection, React.ReactNode>> = {
    summary: basics.summary ? (
      <p className="max-w-[72ch] leading-relaxed whitespace-pre-line text-ink/90">
        {basics.summary}
      </p>
    ) : undefined,
    skills:
      resume.skills.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {resume.skills.map((group) => (
            <p key={group.name} className="max-w-[72ch] text-sm print:break-inside-avoid">
              <span className="font-medium">{group.name}:</span>{" "}
              <span className="text-ink/90">{group.keywords.join(", ")}</span>
            </p>
          ))}
        </div>
      ) : undefined,
    experience:
      resume.work.length > 0 ? (
        <ol className="flex flex-col gap-4">
          {resume.work.map((job) => (
            <li
              key={`${job.name}-${job.startDate}-${job.position}`}
              className="flex flex-col gap-0.5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 className="font-medium">{job.position}</h3>
                {config.fields.dates ? (
                  <time className="font-mono text-xs text-muted whitespace-nowrap">
                    {dateRange(job.startDate, job.endDate)}
                  </time>
                ) : null}
              </div>
              <p className="text-sm text-accent-strong">{job.name}</p>
              {job.summary ? (
                <p className="max-w-[72ch] text-sm leading-relaxed text-ink/90">{job.summary}</p>
              ) : null}
              {config.fields.highlights ? (
                <Highlights items={job.highlights ?? NO_HIGHLIGHTS} />
              ) : null}
              {config.fields.used && job.keywords && job.keywords.length > 0 ? (
                <p className="text-xs text-muted">Used: {job.keywords.join(" · ")}</p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : undefined,
    projects:
      resume.projects.length > 0 ? (
        <ol className="flex flex-col gap-4">
          {resume.projects.map((project) => (
            <li key={project.name} className="flex flex-col gap-0.5 print:break-inside-avoid">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 className="font-medium">{project.name}</h3>
                {config.fields.projectUrls && project.url ? (
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
              {project.description ? (
                <p className="max-w-[72ch] text-sm leading-relaxed text-ink/90">
                  {project.description}
                </p>
              ) : null}
              {config.fields.builtWith && project.keywords && project.keywords.length > 0 ? (
                <p className="text-xs text-muted">Built with: {project.keywords.join(" · ")}</p>
              ) : null}
              {config.fields.highlights ? (
                <Highlights items={project.highlights ?? NO_HIGHLIGHTS} />
              ) : null}
            </li>
          ))}
        </ol>
      ) : undefined,
    education:
      resume.education.length > 0 ? (
        <ol className="flex flex-col gap-3">
          {resume.education.map((entry) => (
            <li
              key={`${entry.institution}-${entry.startDate}`}
              className="flex flex-col gap-0.5 print:break-inside-avoid"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 className="font-medium">{entry.studyType}</h3>
                {config.fields.dates ? (
                  <time className="font-mono text-xs text-muted whitespace-nowrap">
                    {dateRange(entry.startDate, entry.endDate)}
                  </time>
                ) : null}
              </div>
              <p className="text-sm text-accent-strong">{entry.institution}</p>
              {entry.area ? <p className="text-sm text-muted">{entry.area}</p> : null}
              {entry.courses && entry.courses.length > 0 ? (
                <p className="text-xs text-muted">{entry.courses.join(" · ")}</p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : undefined,
  };

  const visibleSections = layout.filter(
    (entry) => entry.visible && entry.section !== "original-pdf",
  );

  return (
    <div className="flex flex-col gap-8 print:gap-4">
      <header
        className={`flex gap-4 ${
          config.photoPosition === "left"
            ? "flex-row-reverse items-start"
            : photoOnTop
              ? "flex-col-reverse items-center"
              : "items-start"
        } ${photoOnTop ? "text-center" : ""}`}
      >
        <div className={`flex min-w-0 flex-col gap-1 ${photoOnTop ? "items-center" : "flex-1"}`}>
          <h1 className="text-3xl font-semibold wrap-anywhere print:text-2xl">{basics.name}</h1>
          {headline ? <p className="text-sm font-medium text-accent-strong">{headline}</p> : null}
          {contact.length > 0 ? (
            <p
              className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted ${
                photoOnTop ? "justify-center" : ""
              }`}
            >
              {contact}
            </p>
          ) : null}
          {config.fields.links && resume.basics.profiles && resume.basics.profiles.length > 0 ? (
            <p
              className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${
                photoOnTop ? "justify-center" : ""
              }`}
            >
              {resume.basics.profiles.map((profileLink) => (
                <a
                  key={profileLink.url}
                  href={profileLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-strong hover:underline"
                >
                  {profileLink.network}
                </a>
              ))}
            </p>
          ) : null}
        </div>
        {photoNode}
      </header>

      {visibleSections
        .filter((entry) => sectionNodes[entry.section])
        .map((entry) => (
          <Section key={entry.section} title={entry.title ?? CV_SECTION_LABELS[entry.section]}>
            {sectionNodes[entry.section]}
          </Section>
        ))}
    </div>
  );
}
