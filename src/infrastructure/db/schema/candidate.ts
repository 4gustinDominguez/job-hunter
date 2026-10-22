import { date, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { JobPreferences } from "@/domain/candidate/candidate-profile";
import { SKILL_CATEGORIES, SKILL_LEVELS } from "@/domain/candidate/skill";
import type { Education } from "@/domain/candidate/education";
import type { Experience } from "@/domain/candidate/experience";
import type { Project } from "@/domain/candidate/project";
import type { Location } from "@/domain/shared/location";

export const candidateProfiles = pgTable("candidate_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  location: jsonb("location").$type<Location>(),
  summary: text("summary"),
  experience: jsonb("experience").$type<Experience[]>().notNull(),
  projects: jsonb("projects").$type<Project[]>().notNull(),
  education: jsonb("education").$type<Education[]>().notNull(),
  preferences: jsonb("preferences").$type<JobPreferences>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const profileSkills = pgTable(
  "profile_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category", { enum: SKILL_CATEGORIES }).notNull(),
    level: text("level", { enum: SKILL_LEVELS }).notNull(),
    yearsOfExperience: integer("years_of_experience"),
    lastUsed: date("last_used", { mode: "date" }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("profile_skills_profile_id_idx").on(table.profileId)],
);
