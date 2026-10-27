export interface CvFacts {
  email?: string;
  phone?: string;
  name?: string;
  /** Full summary/about section, captured verbatim (the model shortens it otherwise). */
  summary?: string;
  /** First summary line when it is a "Title | Stack · Stack" style headline. */
  headline?: string;
  skillNames: string[];
}

const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_CANDIDATE_REGEX = /\(?\+?[\d\s().-]{8,}\d/g;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MIN_PHONE_DIGITS = 9;
const MAX_PHONE_DIGITS = 15;

const NAME_HEADER_BLACKLIST =
  /^(?:curriculum|resume|résumé|cv|vitae|professional|contact|details|profile|about|personal|summary|experience|education|skills?)\b/i;

const SKILLS_HEADING_REGEX =
  /^\s*(?:(?:technical|technologies|tech|core\s+)?\s*skills?|tech\s*stack|stack|core\s+competenc(?:y|ies))\s*:?\s*$/i;

const SECTION_HEADING_REGEX =
  /^\s*(?:\d+[\s.)]+)?\s*(?:work\s+|professional\s+|relevant\s+)?(?:experience|employment(?:\s+history)?|education|academic|projects?|languages?|certifications?|courses?|awards?|honou?rs?|references?|summary|about(?:\s+me)?|contact(?:\s+details)?|personal\s+details|interests|hobbies|volunteering)\s*:?\s*$/i;

const SKILL_MAX_LINES = 40;

const SUMMARY_HEADING_REGEX =
  /^\s*(?:\d+[\s.)]+)?\s*(?:professional\s+|career\s+|personal\s+|candidate\s+)?(?:summary|profile|about(?:\s+me)?|presentation|overview|elevator\s+pitch)\s*:?\s*$/i;

const SUMMARY_CONTACT_LINE_REGEX =
  /^(?:phone|tel(?:ephone)?|e?-?mail|address|linkedin|github|portfolio|website|job\s+preferences?|desired\s+(?:roles|positions))\s*[:|]/i;

const SUMMARY_MAX_LINES = 16;
const SUMMARY_MAX_CHARS = 1600;

/**
 * Deterministic pre-pass over CV text: verifiable facts (contact, name,
 * skills list) extracted with regex only — zero LLM. The model then judges
 * (categories, levels, dates); for contact fields these facts always win.
 */
export function extractCvFacts(text: string): CvFacts {
  const summary = extractSummarySection(text);
  return {
    email: extractEmail(text),
    phone: extractPhone(text),
    name: extractName(text),
    summary: summary.summary,
    headline: summary.headline,
    skillNames: extractSkillNames(text),
  };
}

export function buildFactsBlock(facts: CvFacts): string {
  const lines: string[] = ["EXTRACTED FACTS (deterministic — use verbatim, do not re-invent):"];
  if (facts.name) lines.push(`- Name: ${facts.name}`);
  if (facts.email) lines.push(`- Email: ${facts.email}`);
  if (facts.phone) lines.push(`- Phone: ${facts.phone}`);
  if (facts.summary) {
    lines.push(
      `- Summary (copy VERBATIM as the profile summary — complete, never shorten to one sentence): ${facts.summary}`,
    );
  }
  if (facts.headline) {
    lines.push(
      `- Headline (candidate's positioning — desiredRoles follow this): ${facts.headline}`,
    );
  }
  if (facts.skillNames.length > 0) {
    lines.push(
      `- Skills list (categorize EVERY entry with category and level, keep the original names): ${facts.skillNames.join(", ")}`,
    );
  }
  return lines.join("\n");
}

/**
 * Capture the summary/about section verbatim: from its heading to the next
 * known section heading, contact line, or size cap. Lines are hard-wrapped in
 * PDFs, so join with single spaces (PDF line-wrapping is the only "fix" allowed).
 */
function extractSummarySection(text: string): { summary?: string; headline?: string } {
  const lines = text.split(/\r?\n/);
  let started = false;
  const collected: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!started) {
      if (SUMMARY_HEADING_REGEX.test(line)) started = true;
      continue;
    }
    if (line === "") continue;
    if (
      SECTION_HEADING_REGEX.test(line) ||
      SKILLS_HEADING_REGEX.test(line) ||
      SUMMARY_CONTACT_LINE_REGEX.test(line)
    ) {
      break;
    }
    collected.push(line);
    if (collected.length >= SUMMARY_MAX_LINES) break;
  }
  const joined = collected.join(" ").replace(/\s+/g, " ").trim();
  if (joined === "") return {};
  const summary =
    joined.length > SUMMARY_MAX_CHARS
      ? `${joined.slice(0, SUMMARY_MAX_CHARS).trimEnd()} …`
      : joined;
  const firstLine = collected[0] ?? "";
  const headline = /[|·]/.test(firstLine) ? firstLine : undefined;
  return { summary, headline };
}

function extractEmail(text: string): string | undefined {
  const match = text.match(EMAIL_REGEX);
  return match?.[0];
}

function extractPhone(text: string): string | undefined {
  const candidates = text.match(PHONE_CANDIDATE_REGEX);
  if (!candidates) return undefined;
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (ISO_DATE_REGEX.test(trimmed)) continue;
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) continue;
    // Years-with-dashes false positives ("2022 - 2023") carry two 4-digit blocks
    if (/^\d{4}\s*-\s*\d{4}$/.test(trimmed)) continue;
    return trimmed.replace(/\s+/g, " ");
  }
  return undefined;
}

function extractName(text: string): string | undefined {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line !== "");
  if (!firstLine || firstLine.length > 60) return undefined;
  if (NAME_HEADER_BLACKLIST.test(firstLine)) return undefined;
  if (/[0-9@]/.test(firstLine)) return undefined;
  const words = firstLine.split(/\s+/);
  if (words.length < 2 || words.length > 6) return undefined;
  if (!words.every((word) => /^[\p{L}][\p{L}'.-]*$/u.test(word))) return undefined;
  return firstLine;
}

function extractSkillNames(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const section: string[] = [];
  let inSection = false;
  let scanned = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inSection) {
      if (SKILLS_HEADING_REGEX.test(trimmed)) {
        inSection = true;
      }
      continue;
    }
    if (trimmed === "") continue;
    if (SECTION_HEADING_REGEX.test(trimmed) || SKILLS_HEADING_REGEX.test(trimmed)) break;
    scanned += 1;
    if (scanned > SKILL_MAX_LINES) break;
    section.push(trimmed);
  }

  const names: string[] = [];
  const seen = new Set<string>();
  for (const logicalLine of joinWrappedLines(section)) {
    for (const raw of splitSkillLine(logicalLine)) {
      const name = cleanSkillName(raw);
      const key = name.toLowerCase();
      if (name.length >= 2 && name.length <= 40 && !seen.has(key)) {
        seen.add(key);
        names.push(name);
      }
    }
  }
  return names;
}

/**
 * PDFs hard-wrap long list lines mid-word ("… | Ja" / "vaScript ES6+ / …"),
 * which would otherwise produce broken skill names. Re-join a line with the
 * next when it ends in a letter/digit and the next starts lowercase (a fresh
 * item would start after a separator or uppercase).
 */
function joinWrappedLines(lines: readonly string[]): string[] {
  const joined: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    let current = lines[index];
    while (
      index + 1 < lines.length &&
      /[0-9\p{L}]$/u.test(current) &&
      /^\p{Ll}/u.test(lines[index + 1])
    ) {
      current += lines[index + 1];
      index += 1;
    }
    joined.push(current);
  }
  return joined;
}

function splitSkillLine(line: string): string[] {
  return line
    .replace(/^[•\-*–●▪]+\s*/, "")
    .split(/[,;·|/]|(?:\s+and\s+)|(?:\s+&\s+)/i)
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

function cleanSkillName(value: string): string {
  return (
    value
      .replace(/\([^)]*\)/g, " ")
      // Wrap/split artifacts leave unbalanced parens ("(Sass" / "Less)") — drop
      // the stray characters after balanced content was removed above.
      .replace(/[()]/g, " ")
      .replace(
        /\s*[—–-]\s*(?:beginner|intermediate|advanced|expert|basic|b[12]|c[12]|a[12]|junior|mid|senior|excellent|good|native|fluent).*$/i,
        " ",
      )
      .replace(/\s+/g, " ")
      .trim()
  );
}
