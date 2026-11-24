import { profileDraftSchema, type ProfileDraft } from "@/application/cv/profile-draft-schema";
import { SKILL_CATEGORIES, SKILL_LEVELS, RETIRED_SKILL_CATEGORIES } from "@/domain/candidate/skill";
import { extractJsonBlock } from "./json-from-text";

const PRESENT_DATE_VALUES = new Set(["present", "current", "now", "ongoing"]);

/** Model drift → the current taxonomy (aliases win over the allowed list). */
const CATEGORY_ALIASES: Record<string, string> = {
  DB: "DATABASE",
  DATA: "DATABASE",
  DATASTORE: "DATABASE",
  DATA_BASE: "DATABASE",
  CLOUD: "CLOUD_DEVOPS",
  DEVOPS: "CLOUD_DEVOPS",
  INFRA: "CLOUD_DEVOPS",
  INFRASTRUCTURE: "CLOUD_DEVOPS",
  AWS: "CLOUD_DEVOPS",
  TOOL: "CLOUD_DEVOPS",
  TOOLS: "CLOUD_DEVOPS",
  API: "BACKEND",
  APIS: "BACKEND",
  SERVER: "BACKEND",
  QA: "TESTING",
  QUALITY: "TESTING",
  UI: "FRONTEND",
  UX: "FRONTEND",
  FRAMEWORK: "FRONTEND",
  FRAMEWORKS: "FRONTEND",
  LIBRARY: "FRONTEND",
  DESIGN: "ARCHITECTURE",
  ARCH: "ARCHITECTURE",
  PERF: "PERFORMANCE",
  OBSERVABILITY: "PERFORMANCE",
  MONITORING: "PERFORMANCE",
  ML: "AI",
  LLM: "AI",
  MACHINE_LEARNING: "AI",
  LANG: "LANGUAGE",
  LANGUAGES: "LANGUAGE",
  CODING: "PROGRAMMING",
};

const LEVEL_ALIASES: Record<string, string> = {
  A1: "BEGINNER",
  A2: "BEGINNER",
  B1: "INTERMEDIATE",
  B2: "INTERMEDIATE",
  C1: "ADVANCED",
  C2: "ADVANCED",
  NATIVE: "EXPERT",
  BILINGUAL: "EXPERT",
  FLUENT: "ADVANCED",
  EXCELLENT: "EXPERT",
  GOOD: "INTERMEDIATE",
  JUNIOR: "BEGINNER",
  MID: "INTERMEDIATE",
  MID_LEVEL: "INTERMEDIATE",
  SENIOR: "ADVANCED",
  LEAD: "ADVANCED",
};

function coerceEnumValue(
  value: string,
  allowed: readonly string[],
  aliases: Record<string, string>,
): string {
  const upper = value.trim().toUpperCase().replace(/\s+/g, "_");
  const alias = aliases[upper];
  if (alias) return alias;
  if (allowed.includes(upper)) return upper;
  const singular = upper.endsWith("S") ? upper.slice(0, -1) : upper;
  if (allowed.includes(singular)) return singular;
  return upper;
}

function stripNullsAndNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripNullsAndNormalize(item))
      .filter((item) => item !== null && item !== undefined);
  }
  if (value !== null && typeof value === "object") {
    const normalized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === null) continue;
      if (
        key === "endDate" &&
        typeof entry === "string" &&
        (PRESENT_DATE_VALUES.has(entry.trim().toLowerCase()) || Number.isNaN(Date.parse(entry)))
      ) {
        continue;
      }
      const cleaned = stripNullsAndNormalize(entry);
      if (cleaned === null || cleaned === undefined) continue;
      if (key === "category" && typeof cleaned === "string") {
        normalized[key] = coerceEnumValue(cleaned, SKILL_CATEGORIES, CATEGORY_ALIASES);
        continue;
      }
      if (key === "level" && typeof cleaned === "string") {
        normalized[key] = coerceEnumValue(cleaned, SKILL_LEVELS, LEVEL_ALIASES);
        continue;
      }
      if (key === "salaryExpectation" && typeof cleaned === "object" && !Array.isArray(cleaned)) {
        const salary = cleaned as Record<string, unknown>;
        let minimum = salary.minimum;
        const currency = typeof salary.currency === "string" ? salary.currency.trim() : undefined;
        if (
          typeof minimum === "string" &&
          minimum.trim() !== "" &&
          !Number.isNaN(Number(minimum.trim()))
        ) {
          minimum = Number(minimum.trim());
        }
        if (typeof minimum !== "number" || !Number.isFinite(minimum) || !currency) {
          continue;
        }
        normalized[key] = { minimum, currency };
        continue;
      }
      normalized[key] = cleaned;
    }
    return normalized;
  }
  return value;
}

/** Skills whose category left the taxonomy (e.g. SOFT_SKILL) don't belong in it. */
function dropRetiredSkills(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const draft = value as Record<string, unknown>;
  if (!Array.isArray(draft.skills)) return value;
  return {
    ...draft,
    skills: draft.skills.filter((item) => {
      const category = (item as { category?: unknown } | null)?.category;
      return !(typeof category === "string" && RETIRED_SKILL_CATEGORIES.has(category));
    }),
  };
}

function valueAtPath(root: unknown, path: ReadonlyArray<PropertyKey>): unknown {
  let current: unknown = root;
  for (const segment of path) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<PropertyKey, unknown>)[segment];
  }
  return current;
}

export function tryParseDraft(
  raw: string,
): { ok: true; draft: ProfileDraft } | { ok: false; issue: string } {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(extractJsonBlock(raw));
  } catch {
    return { ok: false, issue: "The response is not valid JSON." };
  }
  const normalized = dropRetiredSkills(stripNullsAndNormalize(parsedJson));
  const result = profileDraftSchema.safeParse(normalized);
  if (!result.success) {
    const issue = result.error.issues
      .slice(0, 6)
      .map((item) => {
        const received = JSON.stringify(valueAtPath(normalized, item.path));
        const location = item.path.join(".") || "(root)";
        return `${location}: ${item.message}${received === undefined ? "" : ` (received ${received})`}`;
      })
      .join("; ");
    return { ok: false, issue };
  }
  return { ok: true, draft: result.data };
}
