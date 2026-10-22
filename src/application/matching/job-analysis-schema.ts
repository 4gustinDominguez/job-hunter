import { z } from "zod";
import { SKILL_LEVELS } from "@/domain/candidate/skill";
import {
  MATCH_CLASSIFICATIONS,
  SKILL_MATCH_STATUSES,
  type JobAnalysis,
} from "@/domain/matching/job-analysis";

export const skillMatchSchema = z.object({
  skill: z.string().trim().min(1),
  candidateLevel: z.enum(SKILL_LEVELS).optional(),
  requiredLevel: z.enum(SKILL_LEVELS).optional(),
  status: z.enum(SKILL_MATCH_STATUSES),
});

export const jobAnalysisSchema = z.object({
  classification: z.enum(MATCH_CLASSIFICATIONS),
  matched: z.array(skillMatchSchema).default([]),
  gaps: z.array(z.string().trim().min(1)).default([]),
  unknowns: z.array(z.string().trim().min(1)).default([]),
  experience: z.array(z.string().trim().min(1)).default([]),
  location: z.array(z.string().trim().min(1)).default([]),
  salary: z.array(z.string().trim().min(1)).default([]),
  reasoning: z.string().trim().min(1),
});

export type JobAnalysisDraft = z.infer<typeof jobAnalysisSchema>;

export function parseAnalysis(value: unknown): JobAnalysis {
  return jobAnalysisSchema.parse(value);
}
