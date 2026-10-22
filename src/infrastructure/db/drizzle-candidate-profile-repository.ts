import { asc, desc, eq } from "drizzle-orm";
import type { CandidateProfileRepositoryPort } from "@/application/ports/candidate-profile-repository-port";
import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import type { Education } from "@/domain/candidate/education";
import type { Experience } from "@/domain/candidate/experience";
import type { Skill } from "@/domain/candidate/skill";
import type { db } from "./client";
import { candidateProfiles, profileSkills } from "./schema";

type Db = typeof db;
type ProfileRow = typeof candidateProfiles.$inferSelect;
type SkillRow = typeof profileSkills.$inferSelect;

function reviveExperience(items: Experience[]): Experience[] {
  return items.map((item) => ({
    ...item,
    startDate: new Date(item.startDate),
    endDate: item.endDate ? new Date(item.endDate) : undefined,
  }));
}

function reviveEducation(items: Education[]): Education[] {
  return items.map((item) => ({
    ...item,
    startDate: new Date(item.startDate),
    endDate: item.endDate ? new Date(item.endDate) : undefined,
  }));
}

function toDomainProfile(row: ProfileRow, skills: Skill[]): CandidateProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    location: row.location ?? undefined,
    summary: row.summary ?? undefined,
    experience: reviveExperience(row.experience),
    skills,
    projects: row.projects,
    education: reviveEducation(row.education),
    preferences: row.preferences,
  };
}

function toDomainSkill(row: SkillRow): Skill {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    level: row.level,
    yearsOfExperience: row.yearsOfExperience ?? undefined,
    lastUsed: row.lastUsed ?? undefined,
  };
}

export class DrizzleCandidateProfileRepository implements CandidateProfileRepositoryPort {
  constructor(private readonly database: Db) {}

  async getById(id: string): Promise<CandidateProfile | null> {
    const [row] = await this.database
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.id, id))
      .limit(1);
    if (!row) return null;
    const skillRows = await this.database
      .select()
      .from(profileSkills)
      .where(eq(profileSkills.profileId, id))
      .orderBy(asc(profileSkills.position));
    return toDomainProfile(row, skillRows.map(toDomainSkill));
  }

  async findFirst(): Promise<CandidateProfile | null> {
    const [row] = await this.database
      .select()
      .from(candidateProfiles)
      .orderBy(desc(candidateProfiles.createdAt))
      .limit(1);
    if (!row) return null;
    const skillRows = await this.database
      .select()
      .from(profileSkills)
      .where(eq(profileSkills.profileId, row.id))
      .orderBy(asc(profileSkills.position));
    return toDomainProfile(row, skillRows.map(toDomainSkill));
  }

  async save(profile: CandidateProfile): Promise<CandidateProfile> {
    const values = {
      name: profile.name,
      email: profile.email,
      phone: profile.phone ?? null,
      location: profile.location ?? null,
      summary: profile.summary ?? null,
      experience: profile.experience,
      projects: profile.projects,
      education: profile.education,
      preferences: profile.preferences,
    };
    const [row] = await this.database
      .insert(candidateProfiles)
      .values({ id: profile.id, ...values })
      .onConflictDoUpdate({
        target: candidateProfiles.id,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();

    await this.database.delete(profileSkills).where(eq(profileSkills.profileId, profile.id));
    const skillRows =
      profile.skills.length > 0
        ? await this.database
            .insert(profileSkills)
            .values(
              profile.skills.map((skill, index) => ({
                profileId: profile.id,
                name: skill.name,
                category: skill.category,
                level: skill.level,
                yearsOfExperience: skill.yearsOfExperience ?? null,
                lastUsed: skill.lastUsed ?? null,
                position: index,
              })),
            )
            .returning()
        : [];

    return toDomainProfile(row, skillRows.map(toDomainSkill));
  }
}
