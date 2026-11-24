/**
 * External links shown in the CV header (LinkedIn, GitHub, portfolio…).
 * Presentation lives in the template config (`fields.links` toggle); the data
 * itself belongs to the profile and travels with versions.
 */
export interface ProfileLink {
  label: string;
  url: string;
}

export const MAX_PROFILE_LINKS = 6;

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/.test(value);
}

/** Makes any stored/pasted value usable: trims, drops invalid or duplicate URLs, caps the list. */
export function normalizeLinks(input: unknown): ProfileLink[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const links: ProfileLink[] = [];
  for (const raw of input) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) continue;
    const { label, url } = raw as { label?: unknown; url?: unknown };
    if (typeof label !== "string" || typeof url !== "string") continue;
    const cleanLabel = label.trim().slice(0, 40);
    const cleanUrl = url.trim();
    if (!cleanLabel || !isHttpUrl(cleanUrl)) continue;
    if (seen.has(cleanUrl)) continue;
    seen.add(cleanUrl);
    links.push({ label: cleanLabel, url: cleanUrl });
    if (links.length >= MAX_PROFILE_LINKS) break;
  }
  return links;
}
