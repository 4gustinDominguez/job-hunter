import type { SkillLevel } from "@/domain/candidate/skill";

export const MATCH_CLASSIFICATIONS = ["STRONG", "POTENTIAL", "WEAK", "NONE"] as const;

export type MatchClassification = (typeof MATCH_CLASSIFICATIONS)[number];

export const SKILL_MATCH_STATUSES = ["matched", "partial", "missing", "unknown"] as const;

export type SkillMatchStatus = (typeof SKILL_MATCH_STATUSES)[number];

export interface SkillMatch {
  skill: string;
  candidateLevel?: SkillLevel;
  requiredLevel?: SkillLevel;
  status: SkillMatchStatus;
}

export interface JobAnalysis {
  classification: MatchClassification;
  matched: SkillMatch[];
  gaps: string[];
  unknowns: string[];
  experience: string[];
  location: string[];
  salary: string[];
  reasoning: string;
}

export const ANALYSIS_STATES = ["none", "pending", "done", "failed"] as const;

export type AnalysisState = (typeof ANALYSIS_STATES)[number];
