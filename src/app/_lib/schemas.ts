import { z } from "zod";
import {
  educationItemSchema,
  experienceItemSchema,
  projectItemSchema,
  skillItemSchema,
} from "@/application/profile/profile-schemas";
import type { SaveProfileInput } from "@/application/profile/save-profile";
import { EMPLOYMENT_TYPES, SENIORITIES } from "@/domain/job/enums";
import { REMOTE_PREFERENCES } from "@/domain/shared/remote-preference";

const csv = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const optionalNumber = z
  .string()
  .transform((value) => (value.trim() === "" ? undefined : Number(value.trim())))
  .refine((value) => value === undefined || Number.isFinite(value), "Must be a number");

function jsonArray(label: string) {
  return (value: string, ctx: z.RefinementCtx): Record<string, unknown>[] => {
    try {
      const parsed: unknown = JSON.parse(value.trim() === "" ? "[]" : value);
      if (
        !Array.isArray(parsed) ||
        parsed.some((item) => typeof item !== "object" || item === null || Array.isArray(item))
      ) {
        ctx.addIssue({ code: "custom", message: `${label} must be a JSON array of objects` });
        return z.NEVER;
      }
      return parsed as Record<string, unknown>[];
    } catch {
      ctx.addIssue({ code: "custom", message: `${label} must be valid JSON` });
      return z.NEVER;
    }
  };
}

export const profileFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .refine((value) => value.includes("@"), "Must be a valid email"),
  phone: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  city: z.string().trim().optional(),
  region: z.string().trim().optional(),
  country: z.string().trim().optional(),
  desiredRoles: z.string().transform(csv),
  desiredLocations: z.string().transform(csv),
  remotePreference: z.enum(REMOTE_PREFERENCES),
  salaryMinimum: optionalNumber,
  salaryCurrency: z.string().trim().optional(),
  excludedCompanies: z.string().transform(csv),
  employmentTypes: z.array(z.enum(EMPLOYMENT_TYPES)).min(1, "Pick at least one employment type"),
  experience: z.string().transform(jsonArray("Experience")).pipe(z.array(experienceItemSchema)),
  skills: z.string().transform(jsonArray("Skills")).pipe(z.array(skillItemSchema)),
  projects: z.string().transform(jsonArray("Projects")).pipe(z.array(projectItemSchema)),
  education: z.string().transform(jsonArray("Education")).pipe(z.array(educationItemSchema)),
});

export const searchProfileFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  keywords: z.string().transform(csv),
  locations: z.string().transform(csv),
  remotePreference: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(REMOTE_PREFERENCES).optional(),
  ),
  employmentTypes: z.array(z.enum(EMPLOYMENT_TYPES)),
  seniority: z.array(z.enum(SENIORITIES)),
  salaryMinimum: optionalNumber,
  salaryCurrency: z.string().trim().optional(),
  excludedCompanies: z.string().transform(csv),
  excludedKeywords: z.string().transform(csv),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
export type SearchProfileFormValues = z.infer<typeof searchProfileFormSchema>;

export interface ProfileFormState {
  errors: Record<string, string[] | undefined>;
  message: string;
}

export interface SearchProfileFormState {
  errors: Record<string, string[] | undefined>;
  message: string;
}

export interface FetchJobsState {
  message: string;
}

export interface ImportCvState {
  draft?: SaveProfileInput;
  error?: string;
}

export interface DocumentActionState {
  message: string;
  error?: boolean;
}
