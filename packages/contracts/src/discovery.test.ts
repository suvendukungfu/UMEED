import { describe, it, expect } from "vitest";
import {
  DiscoverySourceSchema,
  CrawlRunSchema,
  DiscoveryCandidateSchema,
} from "./discovery";

describe("Discovery Intelligence Contracts", () => {
  it("validates a compliant approved discovery source", () => {
    const validSource = {
      sourceId: "src_delhi_animal_welfare",
      name: "Delhi Animal Welfare Alerts",
      domain: "delhianimalwelfare.org",
      sourceType: "rss_feed",
      description: "Official public announcements and animal distress rescues in Delhi NCR.",
      homepageUrl: "https://delhianimalwelfare.org",
      feedUrl: "https://delhianimalwelfare.org/feed.xml",
      sitemapUrl: null,
      termsUrl: "https://delhianimalwelfare.org/terms",
      license: "Open Government Data License (India)",
      sourceOwner: "Delhi Animal Welfare Department",
      approved: true,
      approvedBy: "coord_sharma",
      approvedAt: new Date().toISOString(),
      robotsStatus: "allowed",
      crawlIntervalMinutes: 60,
      maxPagesPerRun: 15,
      maxDepth: 2,
      requestsPerMinute: 10,
      lastCrawledAt: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      consecutiveFailures: 0,
      healthStatus: "healthy",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSynthetic: false,
    };

    const parsed = DiscoverySourceSchema.parse(validSource);
    expect(parsed.sourceId).toBe("src_delhi_animal_welfare");
    expect(parsed.approved).toBe(true);
  });

  it("validates a crawl run record", () => {
    const validRun = {
      runId: "run_test_001",
      sourceId: "src_delhi_animal_welfare",
      sourceName: "Delhi Animal Welfare Alerts",
      status: "completed",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      pagesDiscovered: 12,
      pagesFetched: 10,
      candidatesExtracted: 3,
      duplicatesFound: 1,
      errorsCount: 0,
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: "info",
          message: "Robots policy verified: Allow",
        },
      ],
      isDryRun: false,
      triggeredBy: "coordinator_dashboard",
    };

    const parsed = CrawlRunSchema.parse(validRun);
    expect(parsed.pagesFetched).toBe(10);
    expect(parsed.status).toBe("completed");
  });

  it("validates a structured discovery candidate", () => {
    const validCandidate = {
      candidateId: "cand_987654",
      sourceId: "src_delhi_animal_welfare",
      sourceName: "Delhi Animal Welfare Alerts",
      sourceUrl: "https://delhianimalwelfare.org/alerts/injured-bull-rohini",
      canonicalUrl: "https://delhianimalwelfare.org/alerts/injured-bull-rohini",
      sourceTitle: "Injured stray bull requiring orthopedic support in Rohini Sector 16",
      sourcePublishedAt: new Date().toISOString(),
      discoveredAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      contentHash: "a".repeat(64),
      excerpt: "Severe trauma reported in Rohini Sector 16. Animal is non-ambulatory.",
      summary: "Public report of an injured bull with suspected fracture in Sector 16 Rohini.",
      candidateCategory: "injured_animal",
      extractedLocationText: "Rohini Sector 16, North West Delhi",
      approximateLocation: {
        latitude: 28.7327,
        longitude: 77.1181,
        district: "North West Delhi",
        state: "Delhi NCR",
      },
      locationPrecision: "approximate_district",
      locationConfidence: 0.85,
      signalScore: 82,
      signalRelevance: "strong_candidate",
      classificationReasons: ["Explicit injury terminology", "Geographic reference matches Delhi district"],
      extractionVersion: "1.0.0",
      reviewStatus: "new",
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      incidentReference: null,
      duplicateGroupId: null,
      isSynthetic: false,
    };

    const parsed = DiscoveryCandidateSchema.parse(validCandidate);
    expect(parsed.candidateCategory).toBe("injured_animal");
    expect(parsed.signalScore).toBe(82);
  });
});

