import type { CandidateProfile } from "@/domain/candidate/candidate-profile";
import type { Education } from "@/domain/candidate/education";
import type { Experience } from "@/domain/candidate/experience";
import type { Project } from "@/domain/candidate/project";

export interface SummarySuggestionPath {
  collection: "summary";
}

export interface ItemSuggestionPath {
  collection: "experience" | "projects" | "education";
  itemId: string;
  field: "description" | "achievements" | "highlights";
  /** Required for the list fields (achievements/highlights). */
  index?: number;
}

export type SuggestionPath = SummarySuggestionPath | ItemSuggestionPath;

const ITEM_PATH = /^(experience|projects|education):([^.]+)\.(.+)$/;

/**
 * Grammar: `summary` · `experience:<id>.description` ·
 * `experience:<id>.achievements[2]` · `projects:<id>.highlights[1]`.
 * Returns undefined for anything else — callers treat that as stale.
 */
export function parseSuggestionPath(path: string): SuggestionPath | undefined {
  if (path === "summary") return { collection: "summary" };
  const match = path.match(ITEM_PATH);
  if (!match) return undefined;
  const collection = match[1] as ItemSuggestionPath["collection"];
  const itemId = match[2];
  const rest = match[3];
  if (rest === "description") return { collection, itemId, field: "description" };
  const indexed = rest.match(/^(achievements|highlights)\[(\d+)\]$/);
  if (indexed) {
    return {
      collection,
      itemId,
      field: indexed[1] as ItemSuggestionPath["field"],
      index: Number(indexed[2]),
    };
  }
  return undefined;
}

function itemsOf(
  profile: CandidateProfile,
  collection: ItemSuggestionPath["collection"],
): (Experience | Project | Education)[] {
  if (collection === "experience") return profile.experience;
  if (collection === "projects") return profile.projects;
  return profile.education;
}

/** Current text a suggestion would replace, or undefined when the path is stale. */
export function readSuggestionText(
  profile: CandidateProfile,
  path: SuggestionPath,
): string | undefined {
  if (path.collection === "summary") return profile.summary;
  const item = itemsOf(profile, path.collection).find((entry) => entry.id === path.itemId);
  if (!item) return undefined;
  if (path.field === "description") {
    return "description" in item ? item.description : undefined;
  }
  const list =
    path.field === "achievements"
      ? "achievements" in item
        ? item.achievements
        : undefined
      : "highlights" in item
        ? item.highlights
        : undefined;
  return path.index !== undefined ? list?.[path.index] : undefined;
}

/** Returns a new profile with one text replaced; the original when it can't. */
export function writeSuggestionText(
  profile: CandidateProfile,
  path: SuggestionPath,
  text: string,
): CandidateProfile {
  if (path.collection === "summary") return { ...profile, summary: text };

  if (path.collection === "experience") {
    const items = [...profile.experience];
    const index = items.findIndex((entry) => entry.id === path.itemId);
    if (index === -1) return profile;
    const item = items[index];
    if (path.field === "description") {
      items[index] = { ...item, description: text };
    } else {
      const list = [...item.achievements];
      if (path.index === undefined || path.index >= list.length) return profile;
      list[path.index] = text;
      items[index] = { ...item, achievements: list };
    }
    return { ...profile, experience: items };
  }

  if (path.collection === "projects") {
    const items = [...profile.projects];
    const index = items.findIndex((entry) => entry.id === path.itemId);
    if (index === -1) return profile;
    const item = items[index];
    if (path.field === "description") {
      items[index] = { ...item, description: text };
    } else {
      const list = [...item.highlights];
      if (path.index === undefined || path.index >= list.length) return profile;
      list[path.index] = text;
      items[index] = { ...item, highlights: list };
    }
    return { ...profile, projects: items };
  }

  const items = [...profile.education];
  const index = items.findIndex((entry) => entry.id === path.itemId);
  if (index === -1) return profile;
  const item = items[index];
  const list = [...(item.achievements ?? [])];
  if (path.index === undefined || path.index >= list.length) return profile;
  list[path.index] = text;
  items[index] = { ...item, achievements: list };
  return { ...profile, education: items };
}
