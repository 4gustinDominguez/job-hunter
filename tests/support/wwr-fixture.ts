import { readFileSync } from "node:fs";
import type { WwrItem } from "@/infrastructure/job-sources/wwr/wwr-client";

const FIXTURE_URL = new URL("../infrastructure/job-sources/wwr/wwr-rss.xml", import.meta.url);

const decode = (value: string): string =>
  value
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");

const get = (block: string, tag: string): string => {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match?.[1] === undefined ? "" : decode(match[1].trim());
};

/**
 * Minimal fixture reader: mirrors what the real client + XMLParser produce
 * (attributes ignored, entities decoded in text nodes, CDATA unwrapped).
 */
export function readWwrFixtureItems(): WwrItem[] {
  const xml = readFileSync(FIXTURE_URL, "utf8");
  const blocks = xml.split("<item>").slice(1);
  return blocks.map((block) => ({
    title: get(block, "title"),
    link: get(block, "link"),
    guid: get(block, "guid"),
    pubDate: get(block, "pubDate"),
    region: get(block, "region"),
    country: get(block, "country"),
    skills: get(block, "skills"),
    category: get(block, "category"),
    type: get(block, "type"),
    description: get(block, "description"),
  }));
}
