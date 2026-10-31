export interface ExtractedHtmlContent {
  title: string;
  excerpt: string;
  fullCleanText: string;
  publishedAt: string | null;
  canonicalUrlFromMeta: string | null;
  ogDescription: string | null;
}

/**
 * Safe HTML Extractor.
 * Extracts textual content, metadata, and timestamps without executing script or resolving external assets.
 */
export function extractHtmlContent(html: string): ExtractedHtmlContent {
  // 1. Title extraction
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = cleanString(ogTitleMatch ? ogTitleMatch[1] : titleTagMatch ? titleTagMatch[1] : "Untitled Public Web Page");

  // 2. Canonical URL from meta
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  const canonicalUrlFromMeta = canonicalMatch ? canonicalMatch[1].trim() : null;

  // 3. Published Date
  const pubTimeMatch =
    html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
    html.match(/<meta[^>]*name=["']pubdate["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
    html.match(/<time[^>]*datetime=["']([^"']+)["'][^>]*>/i);

  let publishedAt: string | null = null;
  if (pubTimeMatch) {
    const d = new Date(pubTimeMatch[1].trim());
    if (!isNaN(d.getTime())) {
      publishedAt = d.toISOString();
    }
  }

  // 4. Description
  const ogDescMatch =
    html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const ogDescription = ogDescMatch ? cleanString(ogDescMatch[1]) : null;

  // 5. Clean text extraction: remove scripts, styles, header, footer, nav, svg
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ");

  const cleanText = cleanString(text);
  const excerpt = ogDescription || (cleanText.length > 800 ? cleanText.slice(0, 800) + "..." : cleanText);

  return {
    title,
    excerpt: excerpt.slice(0, 1000),
    fullCleanText: cleanText.slice(0, 5000),
    publishedAt,
    canonicalUrlFromMeta,
    ogDescription,
  };
}

function cleanString(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

