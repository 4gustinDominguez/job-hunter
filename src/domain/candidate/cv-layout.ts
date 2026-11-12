export const CV_SECTIONS = [
  "summary",
  "skills",
  "experience",
  "projects",
  "education",
  "original-pdf",
] as const;

export type CvSection = (typeof CV_SECTIONS)[number];

export const CV_SECTION_LABELS: Record<CvSection, string> = {
  summary: "Summary",
  skills: "Skills",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  "original-pdf": "Original PDF",
};

export interface CvLayoutEntry {
  section: CvSection;
  visible: boolean;
  /** Optional display title — falls back to the section's default label. */
  title?: string;
}

export type CvLayout = CvLayoutEntry[];

/** Current rendering order: the historical fixed order of the /cv page. */
export function defaultCvLayout(): CvLayout {
  return CV_SECTIONS.map((section) => ({ section, visible: true }));
}

function isCvSection(value: unknown): value is CvSection {
  return typeof value === "string" && (CV_SECTIONS as readonly string[]).includes(value);
}

/**
 * Makes any stored value usable: unknown/duplicate entries drop out, missing
 * sections come back visible in default order, and bad flags fall back to
 * visible. /cv never has to handle a partial or stale layout.
 */
export function normalizeCvLayout(input: unknown): CvLayout {
  const seen = new Set<CvSection>();
  const entries: CvLayoutEntry[] = [];

  if (Array.isArray(input)) {
    for (const raw of input) {
      if (typeof raw !== "object" || raw === null) continue;
      const candidate = raw as { section?: unknown; visible?: unknown; title?: unknown };
      if (!isCvSection(candidate.section) || seen.has(candidate.section)) continue;
      seen.add(candidate.section);
      const title =
        typeof candidate.title === "string" && candidate.title.trim() !== ""
          ? candidate.title.trim()
          : undefined;
      entries.push({ section: candidate.section, visible: candidate.visible !== false, title });
    }
  }

  for (const section of CV_SECTIONS) {
    if (!seen.has(section)) entries.push({ section, visible: true });
  }
  return entries;
}
