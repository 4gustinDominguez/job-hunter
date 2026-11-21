export const SKILL_CATEGORIES = [
  "PROGRAMMING",
  "FRAMEWORK",
  "TOOL",
  "SOFT_SKILL",
  "LANGUAGE",
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  PROGRAMMING: "Programming",
  FRAMEWORK: "Frameworks",
  TOOL: "Tools",
  SOFT_SKILL: "Soft skills",
  LANGUAGE: "Languages",
};

/** Rendering order shared by the /cv page and the JSON Resume export. */
export const SKILL_CATEGORY_ORDER: SkillCategory[] = [
  "PROGRAMMING",
  "FRAMEWORK",
  "TOOL",
  "SOFT_SKILL",
  "LANGUAGE",
];

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  yearsOfExperience?: number;
  lastUsed?: Date;
}
