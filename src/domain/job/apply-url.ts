/**
 * Best-effort "real posting URL" hidden inside a job description.
 *
 * WWR listings link to WWR itself (applying needs an account), but the
 * description usually carries the company's own link — often after a
 * "URL:" label, sometimes as an inline anchor whose text survived
 * stripHtml. Returns undefined when nothing usable is found so callers
 * can fall back to the listing URL unchanged.
 */
const LABELLED_URL =
  /(?:^|[\s>])(?:url|apply(?:\s+here)?|how\s+to\s+apply)\s*[:：]\s*(https?:\/\/\S+)/i;
const ANY_URL = /https?:\/\/[^\s<>"'`)\]}]+/g;

/** Aggregator self-links and social profiles are never the posting. */
const EXCLUDED_HOSTS = [
  "weworkremotely.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "github.com",
  "discord.gg",
  "slack.com",
] as const;

function isUsable(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  return !EXCLUDED_HOSTS.some((excluded) => host === excluded || host.endsWith(`.${excluded}`));
}

/** Trim punctuation that commonly trails a URL in prose ("…jobs.", "…jobs)"). */
function trimTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!?]+$/, "");
}

export function extractApplyUrl(description: string): string | undefined {
  const labelled = description.match(LABELLED_URL)?.[1];
  if (labelled !== undefined) {
    const cleaned = trimTrailingPunctuation(labelled);
    if (isUsable(cleaned)) return cleaned;
  }

  for (const match of description.matchAll(ANY_URL)) {
    const cleaned = trimTrailingPunctuation(match[0]);
    if (isUsable(cleaned)) return cleaned;
  }
  return undefined;
}
