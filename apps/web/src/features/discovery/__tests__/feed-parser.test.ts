import { describe, it, expect } from "vitest";
import { parseFeed } from "../crawler/feed-parser";
import { parseSitemap } from "../crawler/sitemap-parser";
import { extractHtmlContent } from "../crawler/html-extractor";
import { normalizeCanonicalUrl, computeContentHash } from "../crawler/content-fingerprint";

describe("Phase 11: Content Extraction & Normalization Parsers", () => {
  it("parses RSS 2.0 feed items safely with CDATA stripping", () => {
    const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>Delhi Animal Welfare</title>
  <item>
    <title><![CDATA[Injured Stray Bull in Rohini]]></title>
    <link>https://delhianimalwelfare.org/alerts/bull-rohini</link>
    <pubDate>Thu, 31 Oct 2026 18:00:00 GMT</pubDate>
    <description><![CDATA[<p>Animal with severe fracture on Sector 16 main road.</p>]]></description>
  </item>
</channel>
</rss>`;

    const items = parseFeed(rssXml);
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("Injured Stray Bull in Rohini");
    expect(items[0].url).toBe("https://delhianimalwelfare.org/alerts/bull-rohini");
    expect(items[0].summary).toBe("Animal with severe fracture on Sector 16 main road.");
  });

  it("parses Atom 1.0 feed entries", () => {
    const atomXml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>DUSIB Alerts</title>
  <entry>
    <title>Cold wave shelter advisory Kashmere Gate</title>
    <link href="https://delhishelterboard.in/alerts/kashmere-gate"/>
    <updated>2026-10-31T19:00:00Z</updated>
    <summary>Emergency blanket distribution tonight.</summary>
  </entry>
</feed>`;

    const items = parseFeed(atomXml);
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("Cold wave shelter advisory Kashmere Gate");
    expect(items[0].url).toBe("https://delhishelterboard.in/alerts/kashmere-gate");
  });

  it("parses XML sitemaps", () => {
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.org/alerts/notice-01</loc>
    <lastmod>2026-10-31</lastmod>
  </url>
  <url>
    <loc>https://example.org/alerts/notice-02</loc>
  </url>
</urlset>`;

    const urls = parseSitemap(sitemapXml);
    expect(urls.length).toBe(2);
    expect(urls[0].url).toBe("https://example.org/alerts/notice-01");
  });

  it("extracts clean text and metadata from HTML while stripping script and style tags", () => {
    const rawHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Distress Notice - Goonj</title>
  <meta property="og:description" content="Community blanket appeal in Okhla.">
  <script>alert('malicious')</script>
  <style>body { color: red; }</style>
</head>
<body>
  <nav><a href="/">Home</a></nav>
  <main>
    <h1>Winter Appeal</h1>
    <p>Over 40 families require immediate dry ration in Okhla Phase 2.</p>
  </main>
  <footer>Copyright 2026</footer>
</body>
</html>`;

    const extracted = extractHtmlContent(rawHtml);
    expect(extracted.title).toBe("Distress Notice - Goonj");
    expect(extracted.ogDescription).toBe("Community blanket appeal in Okhla.");
    expect(extracted.fullCleanText).not.toContain("alert");
    expect(extracted.fullCleanText).not.toContain("Copyright");
    expect(extracted.fullCleanText).toContain("Over 40 families require immediate dry ration");
  });

  it("normalizes canonical URLs by stripping tracking parameters", () => {
    const dirtyUrl = "https://example.org/alerts/case-123/?utm_source=twitter&utm_medium=social&fbclid=abc123xyz#details";
    const cleanUrl = normalizeCanonicalUrl(dirtyUrl);
    expect(cleanUrl).toBe("https://example.org/alerts/case-123");
  });

  it("computes deterministic SHA-256 content hashes", () => {
    const textA = "Severe animal trauma in Rohini Sector 16";
    const textB = "  Severe   animal trauma in   Rohini Sector 16\n";
    expect(computeContentHash(textA)).toBe(computeContentHash(textB));
  });
});

