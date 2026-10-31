import {
  CrawlRun,
  DiscoveryCandidate,
  DiscoverySource,
} from "@umeed/contracts";
import { getSourceRepository, ISourceRepository } from "./repositories/source.repository";
import { getRunRepository, IRunRepository } from "./repositories/run.repository";
import { getCandidateRepository, ICandidateRepository } from "../extraction/candidate.repository";
import { safeHttpFetcher } from "./http-fetcher";
import { parseFeed } from "./feed-parser";
import { parseSitemap } from "./sitemap-parser";
import { extractHtmlContent } from "./html-extractor";
import { normalizeCanonicalUrl, computeContentHash } from "./content-fingerprint";
import { detectLocationFromText } from "../extraction/location-detector";
import { classifySignal } from "../extraction/signal-classifier";
import { logger } from "@/lib/logging";

export interface CrawlExecutionOptions {
  sourceId: string;
  isDryRun?: boolean;
  triggeredBy?: string;
  maxPagesOverride?: number;
}

export class CrawlEngine {
  private sourceRepo: ISourceRepository;
  private runRepo: IRunRepository;
  private candidateRepo: ICandidateRepository;

  constructor(deps?: {
    sourceRepo?: ISourceRepository;
    runRepo?: IRunRepository;
    candidateRepo?: ICandidateRepository;
  }) {
    this.sourceRepo = deps?.sourceRepo || getSourceRepository();
    this.runRepo = deps?.runRepo || getRunRepository();
    this.candidateRepo = deps?.candidateRepo || getCandidateRepository();
  }

  /**
   * Executes a bounded crawl run for an approved source.
   */
  async executeRun(options: CrawlExecutionOptions): Promise<CrawlRun> {
    const { sourceId, isDryRun = false, triggeredBy = "coordinator_manual" } = options;

    // 1. Verify source existence and approval
    const source = await this.sourceRepo.getById(sourceId);
    if (!source) {
      throw new Error(`Source '${sourceId}' does not exist in registry.`);
    }

    if (!source.approved) {
      throw new Error(
        `Source '${source.name}' has not been approved by an authorized coordinator. Crawling forbidden.`
      );
    }

    if (source.healthStatus === "paused") {
      throw new Error(`Source '${source.name}' is currently paused. Resume source before executing crawl.`);
    }

    // 2. Initialize Crawl Run Record
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const crawlRun: CrawlRun = {
      runId,
      sourceId,
      sourceName: source.name,
      status: "running",
      startedAt: new Date().toISOString(),
      completedAt: null,
      pagesDiscovered: 0,
      pagesFetched: 0,
      candidatesExtracted: 0,
      duplicatesFound: 0,
      errorsCount: 0,
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: "info",
          message: `Initiated crawl job for '${source.name}' (dryRun: ${isDryRun})`,
        },
      ],
      isDryRun,
      triggeredBy,
    };

    await this.runRepo.create(crawlRun);

    try {
      // 3. Collect Candidate URLs
      const targetUrls = await this.discoverTargetUrls(source, crawlRun);
      crawlRun.pagesDiscovered = targetUrls.length;
      await this.runRepo.update(runId, { pagesDiscovered: targetUrls.length });

      const maxPages = options.maxPagesOverride || source.maxPagesPerRun || 5;
      const boundedUrls = targetUrls.slice(0, maxPages);

      // 4. Fetch, Extract, and Classify each target URL
      for (const item of boundedUrls) {
        try {
          await this.processTargetUrl(item, source, crawlRun, isDryRun);
          crawlRun.pagesFetched++;
        } catch (err) {
          crawlRun.errorsCount++;
          const errorMsg = `Error processing ${item.url}: ${(err as Error).message}`;
          crawlRun.logs.push({
            timestamp: new Date().toISOString(),
            level: "error",
            message: errorMsg,
          });
          logger.warn(errorMsg, "CRAWL_ENGINE");
        }
      }

      // 5. Finalize Crawl Run
      crawlRun.status = "completed";
      crawlRun.completedAt = new Date().toISOString();
      await this.runRepo.update(runId, {
        status: "completed",
        completedAt: crawlRun.completedAt,
        pagesFetched: crawlRun.pagesFetched,
        candidatesExtracted: crawlRun.candidatesExtracted,
        duplicatesFound: crawlRun.duplicatesFound,
        errorsCount: crawlRun.errorsCount,
      });

      await this.sourceRepo.recordCrawlRun(sourceId, true);
      return crawlRun;
    } catch (fatalErr) {
      crawlRun.status = "failed";
      crawlRun.completedAt = new Date().toISOString();
      crawlRun.errorsCount++;
      crawlRun.logs.push({
        timestamp: new Date().toISOString(),
        level: "error",
        message: `Fatal crawl failure: ${(fatalErr as Error).message}`,
      });

      await this.runRepo.update(runId, {
        status: "failed",
        completedAt: crawlRun.completedAt,
        errorsCount: crawlRun.errorsCount,
      });

      await this.sourceRepo.recordCrawlRun(sourceId, false);
      throw fatalErr;
    }
  }

  private async discoverTargetUrls(
    source: DiscoverySource,
    run: CrawlRun
  ): Promise<{ url: string; titleHint?: string; excerptHint?: string; pubDateHint?: string | null }[]> {
    const results: { url: string; titleHint?: string; excerptHint?: string; pubDateHint?: string | null }[] = [];

    // Handle Synthetic Source (for reliable offline test and demo verification)
    if (source.isSynthetic) {
      return [
        {
          url: "https://demo.umeed.internal/alerts/delhi-shahdara-stray-trauma",
          titleHint: "Injured stray canine with limb fracture reported in Shahdara GT Road",
          excerptHint: "Stray canine hit by truck near flyover. Needs orthopedic trauma ambulance.",
          pubDateHint: new Date().toISOString(),
        },
        {
          url: "https://demo.umeed.internal/alerts/delhi-seelampur-winter-tent",
          titleHint: "Shelter overflow at Seelampur night tent; 20 families requesting blankets",
          excerptHint: "Extremely cold night in North East Delhi. Additional dry rations and emergency blankets required.",
          pubDateHint: new Date().toISOString(),
        },
      ];
    }

    // 1. RSS or Atom feed
    if (source.sourceType === "rss_feed" || source.sourceType === "atom_feed" || source.feedUrl) {
      const feedTarget = source.feedUrl || source.homepageUrl;
      const res = await safeHttpFetcher.fetch(feedTarget, { timeoutMs: 7000 });
      if (res.ok && res.bodyText) {
        const feedItems = parseFeed(res.bodyText);
        for (const item of feedItems) {
          results.push({
            url: item.url,
            titleHint: item.title,
            excerptHint: item.summary,
            pubDateHint: item.publishedAt,
          });
        }
        run.logs.push({
          timestamp: new Date().toISOString(),
          level: "info",
          message: `Parsed feed: discovered ${feedItems.length} candidate URLs.`,
        });
      } else {
        run.logs.push({
          timestamp: new Date().toISOString(),
          level: "warn",
          message: `Feed fetch returned HTTP ${res.status}: ${res.error || res.statusText}`,
        });
      }
    }

    // 2. XML Sitemap
    else if (source.sourceType === "xml_sitemap" || source.sitemapUrl) {
      const sitemapTarget = source.sitemapUrl || `${source.homepageUrl}/sitemap.xml`;
      const res = await safeHttpFetcher.fetch(sitemapTarget, { timeoutMs: 7000 });
      if (res.ok && res.bodyText) {
        const sitemapUrls = parseSitemap(res.bodyText);
        for (const item of sitemapUrls) {
          results.push({
            url: item.url,
            pubDateHint: item.lastModified,
          });
        }
        run.logs.push({
          timestamp: new Date().toISOString(),
          level: "info",
          message: `Parsed XML sitemap: discovered ${sitemapUrls.length} links.`,
        });
      }
    }

    // 3. Approved HTML or fallback to homepage
    if (results.length === 0) {
      results.push({
        url: source.homepageUrl,
      });
    }

    return results;
  }

  private async processTargetUrl(
    item: { url: string; titleHint?: string; excerptHint?: string; pubDateHint?: string | null },
    source: DiscoverySource,
    run: CrawlRun,
    isDryRun: boolean
  ): Promise<void> {
    const canonicalUrl = normalizeCanonicalUrl(item.url);

    // Fetch and extract content
    let title = item.titleHint || "";
    let excerpt = item.excerptHint || "";
    let publishedAt = item.pubDateHint || null;
    let contentForHash = `${title} ${excerpt}`;

    if (!item.titleHint || !item.excerptHint) {
      const fetchResult = await safeHttpFetcher.fetch(canonicalUrl);
      if (!fetchResult.ok) {
        run.logs.push({
          timestamp: new Date().toISOString(),
          level: "warn",
          message: `Skipping ${canonicalUrl}: fetch failed (${fetchResult.error || fetchResult.statusText})`,
        });
        return;
      }

      const extracted = extractHtmlContent(fetchResult.bodyText);
      title = extracted.title;
      excerpt = extracted.excerpt;
      publishedAt = extracted.publishedAt || publishedAt;
      contentForHash = `${title} ${excerpt} ${extracted.fullCleanText}`;
    }

    const contentHash = computeContentHash(contentForHash);

    // Deduplication Check
    const existing = await this.candidateRepo.findByContentHash(contentHash);
    if (existing) {
      run.duplicatesFound++;
      run.logs.push({
        timestamp: new Date().toISOString(),
        level: "info",
        message: `Duplicate detected for ${canonicalUrl} (matched candidate ${existing.candidateId})`,
      });
      return;
    }

    // Location Detection & Coarsening
    const locResult = detectLocationFromText(`${title} ${excerpt}`);

    // AI / Heuristic Signal Classification
    const classification = await classifySignal(title, excerpt);

    const candidateId = `cand_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const candidate: DiscoveryCandidate = {
      candidateId,
      sourceId: source.sourceId,
      sourceName: source.name,
      sourceUrl: item.url,
      canonicalUrl,
      sourceTitle: title.slice(0, 300),
      sourcePublishedAt: publishedAt,
      discoveredAt: now,
      fetchedAt: now,
      contentHash,
      excerpt: excerpt.slice(0, 1000),
      summary: classification.summary.slice(0, 1000),
      candidateCategory: classification.candidateCategory,
      extractedLocationText: locResult.extractedText,
      approximateLocation: locResult.approximateLocation,
      locationPrecision: locResult.locationPrecision,
      locationConfidence: locResult.confidence,
      signalScore: classification.signalScore,
      signalRelevance: classification.signalRelevance,
      classificationReasons: classification.classificationReasons,
      extractionVersion: "1.0.0",
      reviewStatus: "new",
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      incidentReference: null,
      duplicateGroupId: null,
      isSynthetic: source.isSynthetic,
    };

    if (!isDryRun) {
      await this.candidateRepo.create(candidate);
      run.candidatesExtracted++;
      run.logs.push({
        timestamp: now,
        level: "info",
        message: `Created discovery candidate ${candidateId} (Category: ${candidate.candidateCategory}, Score: ${candidate.signalScore})`,
      });
    } else {
      run.candidatesExtracted++;
      run.logs.push({
        timestamp: now,
        level: "info",
        message: `[Dry Run] Extracted candidate: "${title}" (Category: ${candidate.candidateCategory})`,
      });
    }
  }
}

export const crawlEngine = new CrawlEngine();
