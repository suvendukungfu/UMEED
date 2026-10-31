export interface FeedItem {
  title: string;
  url: string;
  publishedAt: string | null;
  summary: string;
}

/**
 * Lightweight, safe RSS & Atom feed parser.
 * Defends against XML External Entity (XXE) attacks by strictly avoiding
 * external entity resolution and using safe regex extraction.
 */
export function parseFeed(feedText: string): FeedItem[] {
  const items: FeedItem[] = [];

  // Check if Atom feed
  const isAtom = feedText.includes("<feed") || feedText.includes("<entry>");

  if (isAtom) {
    const entryRegex = /<entry[\s\S]*?<\/entry>/gi;
    const entries = feedText.match(entryRegex) || [];

    for (const entry of entries) {
      const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const linkMatch = entry.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
      const updatedMatch = entry.match(/<(?:updated|published)[^>]*>([\s\S]*?)<\/(?:updated|published)>/i);
      const summaryMatch = entry.match(/<(?:summary|content)[^>]*>([\s\S]*?)<\/(?:summary|content)>/i);

      const title = cleanText(titleMatch ? titleMatch[1] : "");
      const url = linkMatch ? linkMatch[1].trim() : "";
      const publishedAt = updatedMatch ? parseDate(updatedMatch[1]) : null;
      const summary = cleanText(summaryMatch ? summaryMatch[1] : "");

      if (title && url) {
        items.push({ title, url, publishedAt, summary });
      }
    }
  } else {
    // RSS 2.0 / RSS 1.0
    const itemRegex = /<item[\s\S]*?<\/item>/gi;
    const rawItems = feedText.match(itemRegex) || [];

    for (const item of rawItems) {
      const titleMatch = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const linkMatch = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      const pubDateMatch = item.match(/<(?:pubDate|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|dc:date)>/i);
      const descMatch = item.match(/<(?:description|content:encoded)[^>]*>([\s\S]*?)<\/(?:description|content:encoded)>/i);

      const title = cleanText(titleMatch ? titleMatch[1] : "");
      const url = linkMatch ? cleanText(linkMatch[1]) : "";
      const publishedAt = pubDateMatch ? parseDate(pubDateMatch[1]) : null;
      const summary = cleanText(descMatch ? descMatch[1] : "");

      if (title && url) {
        items.push({ title, url, publishedAt, summary });
      }
    }
  }

  return items;
}

function cleanText(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1") // Strip CDATA
    .replace(/<[^>]+>/g, " ") // Strip HTML tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(rawDate: string): string | null {
  try {
    const cleaned = cleanText(rawDate);
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
    return null;
  } catch {
    return null;
  }
}

