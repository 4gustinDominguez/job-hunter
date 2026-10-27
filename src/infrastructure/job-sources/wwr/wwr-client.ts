/* oxlint-disable no-await-in-loop -- feeds are fetched sequentially so maxItems can stop after the first */
import { XMLParser } from "fast-xml-parser";
import { JobSourceError } from "../job-source-error";

export interface WwrItem {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  region?: string;
  country?: string;
  skills?: string;
  category?: string;
  type?: string;
  description?: string;
}

interface RssDocument {
  rss?: { channel?: { item?: unknown } };
}

// The general feed covers every category; the programming feed adds older
// dev-specific postings the general one has already rotated out. Overlap is
// expected — ingest dedupes by url/guid.
const FEEDS = [
  "https://weworkremotely.com/remote-jobs.rss",
  "https://weworkremotely.com/categories/remote-programming-jobs.rss",
];
const TIMEOUT_MS = 15_000;

/**
 * We Work Remotely: public RSS, no key, remote-only. Response is XML — parsed
 * with fast-xml-parser (CDATA descriptions stay intact for stripHtml).
 */
export class WwrClient {
  async fetchJobs(options: { maxItems?: number } = {}): Promise<WwrItem[]> {
    const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false });
    const byKey = new Map<string, WwrItem>();
    for (const feed of FEEDS) {
      for (const item of await this.fetchFeed(feed, parser)) {
        const key = item.link ?? item.guid ?? item.title;
        if (key !== undefined && key !== "" && !byKey.has(key)) byKey.set(key, item);
      }
      if (
        options.maxItems !== undefined &&
        options.maxItems > 0 &&
        byKey.size >= options.maxItems
      ) {
        break;
      }
    }
    const items = [...byKey.values()];
    if (options.maxItems !== undefined && options.maxItems > 0) {
      return items.slice(0, options.maxItems);
    }
    return items;
  }

  private async fetchFeed(url: string, parser: XMLParser): Promise<WwrItem[]> {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { accept: "application/rss+xml, application/xml, text/xml" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new JobSourceError(
        "WWR",
        `We Work Remotely request failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    if (!response.ok) {
      throw new JobSourceError("WWR", `We Work Remotely responded ${response.status}.`);
    }

    const xml = await response.text();
    const doc = parser.parse(xml) as RssDocument;
    const item = doc?.rss?.channel?.item;
    if (item === undefined) {
      throw new JobSourceError("WWR", "Unexpected We Work Remotely RSS payload shape.");
    }
    return (Array.isArray(item) ? item : [item]) as WwrItem[];
  }
}
