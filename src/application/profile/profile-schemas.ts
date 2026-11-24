import { z } from "zod";
import {
  SKILL_CATEGORIES,
  SKILL_LEVELS,
  LEGACY_SKILL_CATEGORY_MAP,
} from "@/domain/candidate/skill";
import { CV_SECTIONS } from "@/domain/candidate/cv-layout";
import {
  CV_TEMPLATE_PHOTO_POSITIONS,
  CV_TEMPLATE_PHOTO_SHAPES,
  CV_TEMPLATES,
} from "@/domain/candidate/cv-template";

export const isoDateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Must be a valid date (ISO format)");

export const skillItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Skill name is required"),
  // Legacy taxonomy values (FRAMEWORK, TOOL) are accepted and upgraded.
  category: z
    .enum(SKILL_CATEGORIES)
    .or(
      z
        .enum(Object.keys(LEGACY_SKILL_CATEGORY_MAP) as [string, ...string[]])
        .transform((value) => LEGACY_SKILL_CATEGORY_MAP[value]),
    ),
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

/** Raw payload from the layout editor (one hidden JSON input). */
export const cvLayoutEntrySchema = z.object({
  section: z.enum(CV_SECTIONS),
  visible: z.boolean(),
  title: z.string().trim().max(60).optional(),
});

export const cvLayoutSchema = z.array(cvLayoutEntrySchema);

/**
 * A stored CV version (see CvSnapshot). Dates come back from jsonb as strings —
 * z.coerce.date() revives them, and defaults keep partial snapshots loadable.
 */
const snapshotDate = z.coerce.date();

export const cvSnapshotSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  phone: z.string().optional(),
  location: z
    .object({
      city: z.string().optional(),
      region: z.string().optional(),
      country: z.string().optional(),
      isRemote: z.boolean().default(false),
    })
    .optional(),
  summary: z.string().optional(),
  skills: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      category: z.enum(SKILL_CATEGORIES),
      level: z.enum(SKILL_LEVELS),
      yearsOfExperience: z.number().optional(),
      lastUsed: snapshotDate.optional(),
    }),
  ),
  experience: z.array(
    z.object({
      id: z.string(),
      company: z.string(),
      position: z.string(),
      startDate: snapshotDate,
      endDate: snapshotDate.optional(),
      description: z.string().default(""),
      achievements: z.array(z.string()).default([]),
      skills: z.array(z.string()).default([]),
    }),
  ),
  projects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().default(""),
      url: z.string().optional(),
      technologies: z.array(z.string()).default([]),
      highlights: z.array(z.string()).default([]),
    }),
  ),
  education: z.array(
    z.object({
      id: z.string(),
      institution: z.string(),
      degree: z.string(),
      field: z.string(),
      startDate: snapshotDate,
      endDate: snapshotDate.optional(),
      achievements: z.array(z.string()).default([]),
    }),
  ),
  cvLayout: cvLayoutSchema.optional(),
  cvTemplate: z
    .object({
      template: z.enum(CV_TEMPLATES),
      imageUrl: z.string().default(""),
      headline: z.string().default(""),
      photoShape: z.enum(CV_TEMPLATE_PHOTO_SHAPES).default("square"),
      photoPosition: z.enum(CV_TEMPLATE_PHOTO_POSITIONS).default("right"),
      fields: z.object({
        photo: z.boolean().default(true),
        email: z.boolean().default(true),
        phone: z.boolean().default(true),
        location: z.boolean().default(true),
        projectUrls: z.boolean().default(true),
        dates: z.boolean().default(true),
        used: z.boolean().default(true),
        builtWith: z.boolean().default(true),
        highlights: z.boolean().default(true),
      }),
    })
    .optional(),
});
