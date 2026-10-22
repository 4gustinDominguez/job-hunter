import { z } from "zod";
import {
  educationItemSchema,
  experienceItemSchema,
  projectItemSchema,
  skillItemSchema,
} from "@/application/profile/profile-schemas";
import { EMPLOYMENT_TYPES } from "@/domain/job/enums";
import { REMOTE_PREFERENCES } from "@/domain/shared/remote-preference";

export const profileDraftSchema = z.object({
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().optional(),
  summary: z.string().optional(),
  location: z
    .object({
      city: z.string().optional(),
      region: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  experience: z.array(experienceItemSchema).default([]),
  skills: z.array(skillItemSchema).default([]),
  projects: z.array(projectItemSchema).default([]),
  education: z.array(educationItemSchema).default([]),
  preferences: z
    .object({
      desiredRoles: z.array(z.string()).default([]),
      desiredLocations: z.array(z.string()).default([]),
      remotePreference: z.enum(REMOTE_PREFERENCES).default("ANY"),
      salaryExpectation: z
        .object({
          minimum: z.number().nonnegative(),
          currency: z.string().min(1),
        })
        .optional(),
      excludedCompanies: z.array(z.string()).default([]),
      employmentTypes: z.array(z.enum(EMPLOYMENT_TYPES)).default([]),
    })
    .default(() => ({
      desiredRoles: [],
      desiredLocations: [],
      remotePreference: "ANY" as const,
      excludedCompanies: [],
      employmentTypes: [],
    })),
});

export type ProfileDraft = z.infer<typeof profileDraftSchema>;
