import { z } from "zod";
import { SKILL_CATEGORIES, SKILL_LEVELS } from "@/domain/candidate/skill";

export const isoDateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Must be a valid date (ISO format)");

export const skillItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Skill name is required"),
  category: z.enum(SKILL_CATEGORIES),
  level: z.enum(SKILL_LEVELS).default("INTERMEDIATE"),
  yearsOfExperience: z.number().int().nonnegative().optional(),
  lastUsed: isoDateString.optional(),
});

export const experienceItemSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, "Company is required"),
  position: z.string().min(1, "Position is required"),
  startDate: isoDateString,
  endDate: isoDateString.optional(),
  description: z.string().default(""),
  achievements: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
});

export const projectItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Project name is required"),
  description: z.string().default(""),
  url: z.string().optional(),
  technologies: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
});

export const educationItemSchema = z.object({
  id: z.string().optional(),
  institution: z.string().min(1, "Institution is required"),
  degree: z.string().min(1, "Degree is required"),
  field: z.string().min(1, "Field of study is required"),
  startDate: isoDateString,
  endDate: isoDateString.optional(),
  achievements: z.array(z.string()).default([]),
});
