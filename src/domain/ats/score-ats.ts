import type { JsonResume } from "@/domain/candidate/json-resume";
import type { AtsCheck, AtsIssue, AtsRating, AtsReport } from "./ats-report";

/**
 * ATS scoring adapted from the JSON Resume ATS subsystem (MIT): contact 20 ·
 * work 20 · education 15 · skills 15 · keywords 15 · dates 10 · PDF
 * readability 5 (replaces their theme check — here the question is whether the
 * file you send can be read at all). Fully deterministic, no LLM.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Unanchored — for matching an address anywhere inside extracted PDF text. */
const EMAIL_IN_TEXT = /[^\s@]+@[^\s@]+\.[^\s@]+/;

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function allText(resume: JsonResume): string {
  const parts: Array<string | undefined> = [
    resume.basics.name,
    resume.basics.label,
    resume.basics.summary,
    resume.basics.email,
    resume.basics.phone,
  ];
  for (const job of resume.work) {
    parts.push(
      job.name,
      job.position,
      job.summary,
      ...(job.highlights ?? []),
      ...(job.keywords ?? []),
    );
  }
  for (const entry of resume.education) {
    parts.push(entry.institution, entry.studyType, entry.area, ...(entry.courses ?? []));
  }
  for (const skill of resume.skills) {
    parts.push(skill.name, ...skill.keywords);
  }
  for (const project of resume.projects) {
    parts.push(
      project.name,
      project.description,
      ...(project.highlights ?? []),
      ...(project.keywords ?? []),
    );
  }
  return parts.filter(Boolean).join(" \n ");
}

function checkContact(resume: JsonResume): AtsCheck {
  const issues: AtsIssue[] = [];
  let score = 0;
  const basics = resume.basics;

  if (basics.name.trim()) score += 5;
  else issues.push({ severity: "critical", message: "Name is missing.", field: "basics.name" });

  if (basics.email && EMAIL.test(basics.email)) score += 5;
  else
    issues.push({
      severity: "critical",
      message: basics.email ? "Email format is not valid." : "Email is missing.",
      field: "basics.email",
    });

  if (basics.phone?.trim()) score += 5;
  else issues.push({ severity: "warning", message: "Phone is missing.", field: "basics.phone" });

  const location = basics.location;
  if (location && (location.city || location.region || location.country)) score += 5;
  else
    issues.push({ severity: "warning", message: "Location is missing.", field: "basics.location" });

  return { id: "contact", name: "Contact information", score, maxScore: 20, issues };
}

function checkWork(resume: JsonResume): AtsCheck {
  const issues: AtsIssue[] = [];
  let score = 0;

  if (resume.work.length > 0) score += 5;
  else
    issues.push({ severity: "critical", message: "No work experience exported.", field: "work" });

  resume.work.forEach((job, index) => {
    if (job.name.trim()) score += 3;
    else
      issues.push({
        severity: "warning",
        message: `Job ${index + 1}: company name is missing.`,
        field: `work[${index}].name`,
      });
    if (job.position.trim()) score += 3;
    else
      issues.push({
        severity: "warning",
        message: `Job ${index + 1}: position/title is missing.`,
        field: `work[${index}].position`,
      });
    if (job.startDate) score += 3;
    else
      issues.push({
        severity: "warning",
        message: `Job ${index + 1}: start date is missing.`,
        field: `work[${index}].startDate`,
      });
    if (job.summary || (job.highlights && job.highlights.length > 0)) score += 3;
    else
      issues.push({
        severity: "warning",
        message: `Job ${index + 1}: no description or achievements — an ATS finds nothing to match.`,
        field: `work[${index}].summary`,
      });
  });

  return {
    id: "work",
    name: "Work experience",
    score: Math.min(score, 20),
    maxScore: 20,
    issues,
  };
}

function checkEducation(resume: JsonResume): AtsCheck {
  const issues: AtsIssue[] = [];
  let score = 0;

  if (resume.education.length > 0) score += 5;
  else issues.push({ severity: "warning", message: "No education exported.", field: "education" });

  resume.education.forEach((entry, index) => {
    if (entry.institution.trim()) score += 5;
    else
      issues.push({
        severity: "warning",
        message: `Education ${index + 1}: institution is missing.`,
        field: `education[${index}].institution`,
      });
    if (entry.studyType.trim() || entry.area.trim()) score += 5;
    else
      issues.push({
        severity: "warning",
        message: `Education ${index + 1}: degree or field of study is missing.`,
        field: `education[${index}].studyType`,
      });
  });

  return {
    id: "education",
    name: "Education",
    score: Math.min(score, 15),
    maxScore: 15,
    issues,
  };
}

function checkSkills(resume: JsonResume): AtsCheck {
  const issues: AtsIssue[] = [];
  const groups = resume.skills.filter((group) => group.keywords.length > 0);
  const totalKeywords = groups.reduce((sum, group) => sum + group.keywords.length, 0);
  let score = 0;

  if (totalKeywords > 0) score += 5;
  else issues.push({ severity: "warning", message: "No skills exported.", field: "skills" });

  if (groups.length >= 3) score += 5;
  else {
    score += round1((groups.length / 3) * 5);
    issues.push({
      severity: "info",
      message: `Only ${groups.length} skill group${groups.length === 1 ? "" : "s"} — 3+ groups read better.`,
      field: "skills",
    });
  }

  if (totalKeywords >= 10) score += 5;
  else {
    score += round1((totalKeywords / 10) * 5);
    issues.push({
      severity: "info",
      message: `Only ${totalKeywords} skill keyword${totalKeywords === 1 ? "" : "s"} — aim for 10+ (the ones you really have).`,
      field: "skills",
    });
  }

  return { id: "skills", name: "Skills", score: Math.min(round1(score), 15), maxScore: 15, issues };
}

function checkKeywords(resume: JsonResume): AtsCheck {
  const issues: AtsIssue[] = [];
  let score = 0;

  const summaryLength = resume.basics.summary?.trim().length ?? 0;
  if (summaryLength >= 50) score += 5;
  else {
    score += round1((summaryLength / 50) * 5);
    issues.push({
      severity: summaryLength === 0 ? "warning" : "info",
      message: `Summary is ${summaryLength} characters — aim for 50+ with your real keywords.`,
      field: "basics.summary",
    });
  }

  const highlights = resume.work.reduce((sum, job) => sum + (job.highlights?.length ?? 0), 0);
  if (highlights >= 5) score += 5;
  else {
    score += round1((highlights / 5) * 5);
    issues.push({
      severity: "info",
      message: `${highlights} achievement bullet${highlights === 1 ? "" : "s"} across all jobs — aim for 5+.`,
      field: "work[].highlights",
    });
  }

  const words = wordCount(allText(resume));
  if (words >= 200) score += 5;
  else {
    score += round1((words / 200) * 5);
    issues.push({
      severity: "info",
      message: `${words} words in the whole resume — aim for 200+.`,
      field: "resume",
    });
  }

  return {
    id: "keywords",
    name: "Keywords and content",
    score: Math.min(round1(score), 15),
    maxScore: 15,
    issues,
  };
}

function checkDates(resume: JsonResume): AtsCheck {
  const issues: AtsIssue[] = [];
  let score = 10;

  resume.work.forEach((job, index) => {
    if (!job.startDate) {
      score -= 2;
      issues.push({
        severity: "warning",
        message: `Job ${index + 1}: missing start date — dates must sit next to each role.`,
        field: `work[${index}].startDate`,
      });
    }
  });
  resume.education.forEach((entry, index) => {
    if (!entry.startDate && !entry.endDate) {
      score -= 1;
      issues.push({
        severity: "info",
        message: `Education ${index + 1}: no dates.`,
        field: `education[${index}].startDate`,
      });
    }
  });

  return { id: "dates", name: "Date formatting", score: Math.max(score, 0), maxScore: 10, issues };
}

/** What an ATS sees when it opens the PDF you uploaded: text layer, headings, contact in body. */
export function checkPdfReadability(text: string, hasFile: boolean): AtsCheck {
  const issues: AtsIssue[] = [];
  if (!hasFile) {
    issues.push({
      severity: "warning",
      message: "No PDF on file — upload the exact CV you send to applications.",
      field: "cv",
    });
    return { id: "pdf", name: "PDF readability", score: 0, maxScore: 5, issues };
  }

  let score = 0;
  const clean = text.replace(/\s+/g, " ").trim();
  const words = wordCount(clean);

  if (words >= 200) score += 3;
  else if (words >= 100) score += 2;
  else if (words >= 10) score += 1;

  if (words < 10) {
    issues.push({
      severity: "critical",
      message: "The PDF has no readable text layer (image-only or scanned) — an ATS reads nothing.",
      field: "cv",
    });
  } else if (words < 200) {
    issues.push({
      severity: "warning",
      message: `Only ${words} words extracted from the PDF — expect 200+ in a full resume.`,
      field: "cv",
    });
  }

  if (
    /\b(experience|employment|work history|education|skills|technologies|projects)\b/i.test(clean)
  ) {
    score += 1;
  } else {
    issues.push({
      severity: "warning",
      message:
        "No standard section headings (Experience, Education, Skills…) detected in the PDF text.",
      field: "cv",
    });
  }

  if (EMAIL_IN_TEXT.test(clean)) score += 1;
  else
    issues.push({
      severity: "warning",
      message:
        "Email not found in the PDF body — contact details must not live only in a header or footer.",
      field: "cv",
    });

  return { id: "pdf", name: "PDF readability", score: Math.min(score, 5), maxScore: 5, issues };
}

/** The six data checks (95 points) — the PDF check is appended by the use case. */
export function scoreResume(resume: JsonResume): AtsCheck[] {
  return [
    checkContact(resume),
    checkWork(resume),
    checkEducation(resume),
    checkSkills(resume),
    checkKeywords(resume),
    checkDates(resume),
  ];
}

function ratingFor(score: number): AtsRating {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Poor";
  return "Needs Improvement";
}

function summaryFor(score: number, failed: AtsCheck[]): string {
  const names = failed.slice(0, 3).map((check) => check.name.toLowerCase());
  const list = names.join(", ");
  if (score >= 90) return "Excellent — applicant tracking systems will read this cleanly.";
  if (score >= 75) return "Good, with a few things worth fixing before you apply.";
  if (score >= 60) return `Fair — the weak spots are: ${list}.`;
  return `Needs improvement — start with: ${list}.`;
}

export function summarizeAts(checks: AtsCheck[]): AtsReport {
  const total = checks.reduce((sum, check) => sum + check.score, 0);
  const max = checks.reduce((sum, check) => sum + check.maxScore, 0);
  const score = max > 0 ? Math.round((total / max) * 100) : 0;
  const failed = checks
    .filter((check) => check.score < check.maxScore)
    .toSorted((a, b) => a.score / a.maxScore - b.score / b.maxScore);

  return {
    score,
    rating: ratingFor(score),
    checks,
    recommendations: checks.flatMap((check) => check.issues),
    summary: summaryFor(score, failed),
  };
}
