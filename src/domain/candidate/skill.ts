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

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  yearsOfExperience?: number;
  lastUsed?: Date;
}
