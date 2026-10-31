export interface SitemapUrl {
  url: string;
  lastModified: string | null;
}

/**
 * Lightweight, safe XML Sitemap parser.
 */
export function parseSitemap(sitemapText: string): SitemapUrl[] {
  const urls: SitemapUrl[] = [];
  const urlBlockRegex = /<url[\s\S]*?<\/url>/gi;
  const blocks = sitemapText.match(urlBlockRegex) || [];

  for (const block of blocks) {
    const locMatch = block.match(/<loc[^>]*>([\s\S]*?)<\/loc>/i);
    const lastModMatch = block.match(/<lastmod[^>]*>([\s\S]*?)<\/lastmod>/i);

    if (locMatch) {
      const url = locMatch[1].trim();
      let lastModified: string | null = null;
      if (lastModMatch) {
        const d = new Date(lastModMatch[1].trim());
        if (!isNaN(d.getTime())) {
          lastModified = d.toISOString();
        }
      }
      if (url.startsWith("http://") || url.startsWith("https://")) {
        urls.push({ url, lastModified });
      }
    }
  }

  return urls;
}

