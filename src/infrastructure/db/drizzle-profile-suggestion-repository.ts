import { and, desc, eq } from "drizzle-orm";
import type { ProfileSuggestionRepositoryPort } from "@/application/ports/profile-suggestion-repository-port";
import type { ProfileSuggestion, SuggestionStatus } from "@/domain/candidate/profile-suggestion";
import type { db } from "./client";
import { profileSuggestions } from "./schema";

type Db = typeof db;
type SuggestionRow = typeof profileSuggestions.$inferSelect;

function toDomain(row: SuggestionRow): ProfileSuggestion {
  return {
    id: row.id,
    profileId: row.profileId,
    path: row.path,
    category: row.category,
    originalText: row.originalText,
    proposedText: row.proposedText,
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt,
  };
}

export class DrizzleProfileSuggestionRepository implements ProfileSuggestionRepositoryPort {
  constructor(private readonly database: Db) {}

  async listPending(profileId: string): Promise<ProfileSuggestion[]> {
    const rows = await this.database
      .select()
      .from(profileSuggestions)
      .where(
        and(eq(profileSuggestions.profileId, profileId), eq(profileSuggestions.status, "pending")),
      )
      .orderBy(desc(profileSuggestions.createdAt));
    return rows.map(toDomain);
  }

  async getById(id: string): Promise<ProfileSuggestion | null> {
    const [row] = await this.database
      .select()
      .from(profileSuggestions)
      .where(eq(profileSuggestions.id, id))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async replacePending(profileId: string, suggestions: ProfileSuggestion[]): Promise<void> {
    await this.database.transaction(async (tx) => {
      await tx
        .delete(profileSuggestions)
        .where(
          and(
            eq(profileSuggestions.profileId, profileId),
            eq(profileSuggestions.status, "pending"),
          ),
        );
      if (suggestions.length > 0) {
        await tx.insert(profileSuggestions).values(
          suggestions.map((suggestion) => ({
            id: suggestion.id,
            profileId: suggestion.profileId,
            path: suggestion.path,
            category: suggestion.category,
            originalText: suggestion.originalText,
            proposedText: suggestion.proposedText,
            reason: suggestion.reason,
            status: suggestion.status,
            createdAt: suggestion.createdAt,
          })),
        );
      }
    });
  }

  async setStatus(id: string, status: SuggestionStatus): Promise<void> {
    await this.database
      .update(profileSuggestions)
      .set({ status })
      .where(eq(profileSuggestions.id, id));
  }
}
