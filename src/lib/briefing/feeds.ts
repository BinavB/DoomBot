import { fetchJson, fetchText } from "@/lib/http";

interface FeedHeadline {
  title: string;
  link: string;
}

const worldFeedUrl = "https://feeds.bbci.co.uk/news/world/rss.xml";
const techStoriesUrl = "https://hacker-news.firebaseio.com/v0/topstories.json";
const headlineLimit = 8;

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function readTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? decodeEntities(match[1]) : "";
}

export function parseRssItems(xml: string): FeedHeadline[] {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return blocks
    .map((block) => ({ title: readTag(block, "title"), link: readTag(block, "link") }))
    .filter((item) => item.title.length > 0)
    .slice(0, headlineLimit);
}

export async function fetchWorldHeadlines(): Promise<FeedHeadline[]> {
  return parseRssItems(await fetchText(worldFeedUrl));
}

interface HackerNewsItem {
  title?: string;
  url?: string;
  score?: number;
}

export async function fetchTechHeadlines(): Promise<FeedHeadline[]> {
  const ids = (await fetchJson<number[]>(techStoriesUrl)).slice(0, headlineLimit);
  const items = await Promise.all(
    ids.map((id) =>
      fetchJson<HackerNewsItem>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`),
    ),
  );
  return items
    .filter((item) => item.title)
    .map((item) => ({
      title: item.title ?? "",
      link: item.url ?? "",
    }));
}
