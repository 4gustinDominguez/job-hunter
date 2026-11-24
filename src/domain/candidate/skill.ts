export const SKILL_CATEGORIES = [
  "PROGRAMMING",
  "FRONTEND",
  "BACKEND",
  "DATABASE",
  "ARCHITECTURE",
  "CLOUD_DEVOPS",
  "TESTING",
  "PERFORMANCE",
  "AI",
  "LANGUAGE",
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  PROGRAMMING: "Programming Languages",
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  DATABASE: "Databases",
  ARCHITECTURE: "Software Architecture",
  CLOUD_DEVOPS: "Cloud & DevOps",
  TESTING: "Testing & Quality",
  PERFORMANCE: "Performance & Observability",
  AI: "AI & LLM Development",
  LANGUAGE: "Languages",
};

/** Rendering order shared by the /cv page and the JSON Resume export. */
export const SKILL_CATEGORY_ORDER: SkillCategory[] = [
  "PROGRAMMING",
  "FRONTEND",
  "BACKEND",
  "DATABASE",
  "ARCHITECTURE",
  "CLOUD_DEVOPS",
  "TESTING",
  "PERFORMANCE",
  "AI",
  "LANGUAGE",
];

/** Categories written by earlier versions of the taxonomy (kept readable, mapped on read/save). */
export const LEGACY_SKILL_CATEGORY_MAP: Record<string, SkillCategory> = {
  FRAMEWORK: "FRONTEND",
  TOOL: "CLOUD_DEVOPS",
};

/** Retired categories with no place in the current taxonomy — dropped on import. */
export const RETIRED_SKILL_CATEGORIES = new Set(["SOFT_SKILL"]);

/** Accepts current and legacy category strings; undefined when unmappable. */
export function normalizeSkillCategory(value: string): SkillCategory | undefined {
  if ((SKILL_CATEGORIES as readonly string[]).includes(value)) return value as SkillCategory;
  return LEGACY_SKILL_CATEGORY_MAP[value];
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  yearsOfExperience?: number;
  lastUsed?: Date;
}
